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

import type { InterviewSubmitAnswerResponse } from "@/lib/api/types";

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

/**
 * Two channels share this one topic and one `seq`.
 *
 * `accepted` / `rejected` / `completed` / `failed` are TURN-scoped and correlate
 * to a `turn_key`. `snapshot` is SESSION-scoped: `turn_key` is null, no turn owns
 * it, and it is absolute rather than a delta.
 *
 * `completed` and `failed` exist for the legacy routed agent only. The native
 * agent streams, so a turn has no single instant where one structured result
 * becomes true — it acks, then reports state changes as snapshots.
 */
export type ControlStatus =
  | "accepted"
  | "completed"
  | "rejected"
  | "failed"
  | "snapshot"
  | "agent_action";

const CONTROL_STATUSES: readonly ControlStatus[] = [
  "accepted",
  "completed",
  "rejected",
  "failed",
  "snapshot",
  "agent_action",
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
 * This IS the REST `/respond` response body — the bridge publishes
 * `InterviewSubmitAnswerResponse.model_dump(mode="json")` verbatim, built by the
 * same `from_step_result` classmethod the REST route uses. `next_question` is
 * the projected `InterviewQuestionPublic` the client needs to render the next
 * Question Card; `transition_*`, `pending_confirmation` and the adaptive fields
 * drive the same sequencing the REST path does.
 *
 * Every field is optional-with-null so a partially-populated frame degrades to
 * "treat as absent" instead of throwing inside the stream handler.
 */
export type ControlTurnState = InterviewSubmitAnswerResponse;

/**
 * The server's whole view of the session, carried by a `snapshot` event.
 *
 * Absolute, never a delta: a client replaces its view wholesale, so there is no
 * field-level merge to get wrong and a dropped snapshot self-heals on the next
 * one. Mirrors the backend's `StateSnapshot`.
 */
export interface StateSnapshot {
  currentQuestionId: string | null;
  currentQuestionText: string | null;
  questionNumber: number;
  questionsRemaining: number;
  /**
   * The size of the session's question pool — the counter's denominator.
   *
   * Sent explicitly rather than derived as `questionNumber + questionsRemaining`:
   * those come from different server-side sources and drifted apart, walking the
   * header from "1 of 3" to "of 4" mid-interview.
   */
  questionsTotal: number;
  outcomesCovered: number;
  outcomesRequired: number;
  isFinished: boolean;
  /**
   * Whether the session has a deadline at all.
   *
   * Exists because `timeRemainingSeconds === null` is otherwise ambiguous: an
   * untimed session and a backend that stopped sending the field look identical,
   * and guessing wrong either invents a deadline or silently kills the timer.
   */
  hasTimeLimit: boolean;
  timeRemainingSeconds: number | null;
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
   * The beat kind an `agent_action` event announces ("hint", "clarify",
   * "question"). Unvalidated on purpose: the agent_action stream is
   * server→client only, and restricting it to TURN_ACTIONS would rename the
   * server's "question" marker to "answer" — the mislabel it exists to
   * prevent. Null on every turn-scoped status.
   */
  actionKind: string | null;
  /**
   * The interview brain's own per-session version, present only on COMPLETED.
   * This is what persisted history is reconciled against; `seq` only orders
   * the control stream.
   */
  stateVersion: number | null;
  rejection: TurnRejection | null;
  state: ControlTurnState | null;
  errorClass: string | null;
  /** Present on `snapshot` only; null on every turn-scoped status. */
  snapshot: StateSnapshot | null;
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

function asNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/** A non-negative counter; anything else degrades to 0 rather than NaN. */
function asCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

/**
 * Parse the `snapshot` payload, field by field, in the same shape as `parseState`.
 *
 * `hasTimeLimit` falls back to "a countdown implies a limit" when the boolean is
 * absent. Defaulting it to false instead would silently disarm the session timer
 * on any protocol drift, which is the one failure mode the field was added to
 * make impossible.
 */
function parseSnapshot(value: unknown): StateSnapshot | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const timeRemainingSeconds = asNullableNumber(raw.time_remaining_seconds);
  return {
    currentQuestionId: asNullableString(raw.current_question_id),
    currentQuestionText: asNullableString(raw.current_question_text),
    questionNumber: asCount(raw.question_number),
    questionsRemaining: asCount(raw.questions_remaining),
    questionsTotal: asCount(raw.questions_total),
    outcomesCovered: asCount(raw.outcomes_covered),
    outcomesRequired: asCount(raw.outcomes_required),
    isFinished: raw.is_finished === true,
    hasTimeLimit:
      typeof raw.has_time_limit === "boolean"
        ? raw.has_time_limit
        : timeRemainingSeconds !== null,
    timeRemainingSeconds,
  };
}

const NEXT_QUESTION_TYPES = [
  "conceptual",
  "behavioral",
  "technical",
  "situational",
  "system_design",
] as const;

/**
 * Parse the serialized `InterviewSubmitAnswerResponse` inside a control event.
 *
 * Mirrors the backend's field-for-field contract. Every field is parsed with a
 * safe-typed helper so a missing or mistyped member degrades to null instead of
 * throwing inside the LiveKit stream handler.
 */
function parseState(value: unknown): ControlTurnState | null {
  const raw = asRecord(value);
  if (!raw) return null;

  const nextQuestionRaw = asRecord(raw.next_question);
  const rawQuestionType = asNullableString(nextQuestionRaw?.question_type);
  const nextQuestion =
    raw.next_question === null || raw.next_question === undefined
      ? null
      : nextQuestionRaw &&
          typeof nextQuestionRaw.id === "string" &&
          typeof nextQuestionRaw.prompt_text === "string" &&
          rawQuestionType !== null &&
          (NEXT_QUESTION_TYPES as readonly string[]).includes(rawQuestionType)
        ? {
            id: nextQuestionRaw.id,
            prompt_text: nextQuestionRaw.prompt_text,
            // Narrowed by the includes() guard above.
            question_type:
              rawQuestionType as (typeof NEXT_QUESTION_TYPES)[number],
          }
        : null;

  return {
    next_question: nextQuestion,
    is_finished: raw.is_finished === true,
    ai_followup_text: asNullableString(raw.ai_followup_text),
    time_remaining_seconds: asNullableNumber(raw.time_remaining_seconds),
    ai_turn_text: asNullableString(raw.ai_turn_text),
    language: asNullableString(raw.language),
    should_narrate: asNullableBoolean(raw.should_narrate),
    should_await_response: asNullableBoolean(raw.should_await_response),
    should_finish: asNullableBoolean(raw.should_finish),
    assistance_kind: asNullableString(raw.assistance_kind) as
      | ControlTurnState["assistance_kind"]
      | null,
    pending_confirmation: asNullableBoolean(raw.pending_confirmation),
    interaction_state: asNullableString(raw.interaction_state),
    transition_id: asNullableString(raw.transition_id),
    transition_text: asNullableString(raw.transition_text),
    transition_target: asNullableString(raw.transition_target) as
      | ControlTurnState["transition_target"]
      | null,
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

  // A snapshot IS its payload, so a snapshot without one carries no information
  // and is dropped like any other malformed frame. `seq` is not consumed for it,
  // which is safe: the agent's counter keeps climbing, so the next event still
  // passes the monotonic guard.
  const snapshot =
    status === "snapshot" ? parseSnapshot(payload.snapshot) : null;
  if (status === "snapshot" && !snapshot) return null;

  return {
    status: status as ControlStatus,
    turnKey: asNullableString(payload.turn_key),
    seq,
    turnAction,
    actionKind:
      status === "agent_action" ? asNullableString(payload.turn_action) : null,
    stateVersion: asNullableNumber(payload.state_version),
    rejection,
    state: parseState(payload.state),
    errorClass: asNullableString(payload.error_class),
    snapshot,
  };
}

/**
 * Whether this status settles the turn its `turn_key` names.
 *
 * Every turn-scoped status does, INCLUDING `accepted`. A streaming agent has no
 * later instant at which one structured turn result becomes true, so a composer
 * that waits past the ack waits for a message that never arrives. `snapshot` is
 * session-scoped and settles nothing.
 */
export function settlesTurn(status: ControlStatus): boolean {
  return status !== "snapshot";
}

/**
 * Whether the candidate's draft should survive this outcome.
 *
 * `rejected` and `failed` both keep it: a rejected turn was never graded, and a
 * failed one may be retried with the SAME turn_key (the agent is idempotent on
 * it). `accepted` clears it — the text reached the agent, which is the only
 * acknowledgement a streaming turn ever gets.
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
