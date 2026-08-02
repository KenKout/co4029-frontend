/**
 * Client half of the typed-turn wire protocol.
 *
 * Mirrors `backend/abridgeai/features/interviews/realtime/text_protocol.py`.
 * Both files describe ONE contract, so the constants below are duplicated
 * deliberately rather than derived: a mismatch must show up as a failing test
 * here, not as a turn silently rejected in production.
 *
 * Three topics:
 *   `lk.chat`                    outbound — the candidate's typed text, with
 *                                turn_action / turn_key as stream attributes
 *   `lk.transcription`           inbound  — the agent's presentation (SDK)
 *   `abridge.interview.control`  inbound  — structured turn state (ours)
 *
 * This module is intentionally free of LiveKit imports: it is pure parsing and
 * validation so it can be unit tested without a room.
 */

/** Outbound: the candidate's typed text. SDK-standard topic. */
export const TOPIC_CHAT = "lk.chat";

/** Inbound: agent presentation, published by the agent's RoomIO. */
export const TOPIC_TRANSCRIPTION = "lk.transcription";

/** Inbound: our structured turn state, correlated by `turn_key`. */
export const TOPIC_CONTROL = "abridge.interview.control";

export const ATTR_TURN_ACTION = "turn_action";
export const ATTR_TURN_KEY = "turn_key";

/**
 * Turn actions the interview brain understands.
 *
 * MUST stay in sync with `VALID_TURN_ACTIONS` in the backend's text_protocol.py
 * and with `take_session_step`'s `turn_action` parameter. The backend REJECTS an
 * unknown action rather than coercing it to "answer", so an out-of-sync value
 * here surfaces as a visible rejection instead of a mis-graded answer.
 */
export const TURN_ACTIONS = [
  "answer",
  "repeat",
  "clarify",
  "explain_term",
  "hint",
] as const;

export type TurnAction = (typeof TURN_ACTIONS)[number];

export const DEFAULT_TURN_ACTION: TurnAction = "answer";

/** Mirrors the backend's `MAX_TEXT_CHARS`. */
export const MAX_TEXT_CHARS = 8_000;

/** Mirrors the backend's `_TURN_KEY_RE`. */
const TURN_KEY_RE = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * True when `key` will pass the agent's validator.
 *
 * Checked before sending so a malformed key is caught locally rather than
 * costing a round-trip and a rejection. Both shapes `newTurnKey()` produces
 * (crypto.randomUUID, and the `tk-<ts>-<rand>` fallback) satisfy this.
 */
export function isValidTurnKey(key: string): boolean {
  return TURN_KEY_RE.test(key);
}

export type ControlStatus = "accepted" | "completed" | "rejected" | "failed";

const CONTROL_STATUSES: readonly ControlStatus[] = [
  "accepted",
  "completed",
  "rejected",
  "failed",
];

export type TurnRejection =
  | "empty_text"
  | "text_too_long"
  | "invalid_turn_action"
  | "invalid_turn_key"
  | "turn_in_flight"
  | "session_closing";

/**
 * The structured state a COMPLETED event carries.
 *
 * Field-for-field the agent's `_control_state` projection, which mirrors the
 * REST `/respond` response body — so a client on this transport needs no extra
 * round-trip to learn the new interview state.
 */
export interface ControlTurnState {
  is_finished: boolean;
  next_question_text: string | null;
  followup_text: string | null;
  ai_turn_text: string | null;
  question_type: string | null;
  time_remaining_seconds: number | null;
}

export interface ControlEvent {
  status: ControlStatus;
  /** Correlates to the `turn_key` sent on `lk.chat`. Null when none was sent. */
  turnKey: string | null;
  /**
   * The agent's control-stream sequence: strictly increasing per session.
   * Use this to order events and discard a stale one after a reconnect.
   * Timestamps are unusable — client clocks skew and LiveKit gives no
   * cross-stream delivery-order guarantee.
   */
  seq: number;
  turnAction: TurnAction;
  /**
   * The interview brain's own per-session version, present only on COMPLETED.
   * This is what persisted history is reconciled against; `seq` only orders
   * the control stream.
   */
  stateVersion: number | null;
  rejection: TurnRejection | null;
  state: ControlTurnState | null;
  errorClass: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseState(value: unknown): ControlTurnState | null {
  const raw = asRecord(value);
  if (!raw) return null;
  return {
    is_finished: raw.is_finished === true,
    next_question_text: asNullableString(raw.next_question_text),
    followup_text: asNullableString(raw.followup_text),
    ai_turn_text: asNullableString(raw.ai_turn_text),
    question_type: asNullableString(raw.question_type),
    time_remaining_seconds: asNullableNumber(raw.time_remaining_seconds),
  };
}

/**
 * Parse one control-topic payload.
 *
 * Returns null for anything malformed instead of throwing: this runs inside a
 * LiveKit stream handler, where an exception would tear down the room over a
 * bad frame. A dropped control event degrades to "composer stays pending until
 * the next event or the timeout" — recoverable; a torn-down room is not.
 *
 * `status` and `seq` are the two fields with no safe default, so a payload
 * missing either is rejected outright. Everything else has a defined absence.
 */
export function parseControlEvent(raw: string): ControlEvent | null {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }
  const payload = asRecord(decoded);
  if (!payload) return null;

  const status = payload.status;
  if (
    typeof status !== "string" ||
    !CONTROL_STATUSES.includes(status as ControlStatus)
  ) {
    return null;
  }

  // Must be an integer: a float or NaN would break the monotonic comparison
  // used to discard stale events.
  const seq = payload.seq;
  if (typeof seq !== "number" || !Number.isInteger(seq)) return null;

  const rawAction = payload.turn_action;
  const turnAction =
    typeof rawAction === "string" &&
    (TURN_ACTIONS as readonly string[]).includes(rawAction)
      ? (rawAction as TurnAction)
      : DEFAULT_TURN_ACTION;

  const rejection = asNullableString(payload.rejection) as TurnRejection | null;

  return {
    status: status as ControlStatus,
    turnKey: asNullableString(payload.turn_key),
    seq,
    turnAction,
    stateVersion: asNullableNumber(payload.state_version),
    rejection,
    state: parseState(payload.state),
    errorClass: asNullableString(payload.error_class),
  };
}

/** A control status that ends a turn — the composer may leave pending. */
export function isTerminalStatus(status: ControlStatus): boolean {
  return status !== "accepted";
}

/**
 * Whether the candidate's draft should survive this outcome.
 *
 * `rejected` and `failed` both keep it: a rejected turn was never graded, and a
 * failed one may be retried with the SAME turn_key (`take_session_step` is
 * idempotent on it). Only a completed turn clears the editor.
 */
export function shouldPreserveDraft(status: ControlStatus): boolean {
  return status === "rejected" || status === "failed";
}

/** Attributes for an outbound `lk.chat` stream. */
export function chatAttributes(args: {
  turnAction: TurnAction;
  turnKey: string;
}): Record<string, string> {
  return {
    [ATTR_TURN_ACTION]: args.turnAction,
    [ATTR_TURN_KEY]: args.turnKey,
  };
}
