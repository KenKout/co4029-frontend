import { useCallback, useEffect, useRef } from "react";

/**
 * Answer-draft autosave (resilience A-Tier-1 #2).
 *
 * The interview composer's text lives only in React state, so a tab crash,
 * accidental navigation, or reload mid-question loses a half-typed answer. This
 * hook mirrors the current draft into `localStorage`, keyed by session +
 * question, and exposes a one-shot `restore` plus the two submit-path
 * transitions: `markSubmitted` and `clear`.
 *
 * Why submitting does NOT delete the draft
 * ----------------------------------------
 * The agent's `accepted` ack means "your text arrived", not "your answer is
 * stored". Grading runs after it and takes seconds, and the transcript row is
 * written on the far side of that. A worker that dies inside that window loses
 * the answer — and deleting the draft on the ack lost the candidate's only other
 * copy with it, so a reload showed an empty composer and no record of the answer
 * they had already sent.
 *
 * So `markSubmitted` MOVES the draft to a `:sent` key instead of removing it.
 * `restore` returns it (the live draft wins if one exists), which puts the text
 * back in the composer after a reload, and `clear` is called once the answer is
 * confirmed present in the server's own transcript — the only evidence that it
 * is actually durable.
 *
 * Design notes:
 * - Key is `abridge:iv-draft:<sessionId>:<questionId>` so each question keeps
 *   its own draft and a new question never shows a stale one.
 * - Writes are debounced (400ms) so fast typing doesn't hammer storage.
 * - Empty/whitespace drafts remove the key rather than storing "" (keeps
 *   storage clean and makes `restore` unambiguous).
 * - All storage access is wrapped — private-mode / disabled-storage throws are
 *   swallowed so autosave can never break the interview.
 */

const PREFIX = "abridge:iv-draft:";
// Suffix for a draft that has been sent and acked but is not yet known to be
// stored server-side. Kept distinct from the live draft so the composer's own
// autosave cannot overwrite the copy we are holding as insurance.
const SENT_SUFFIX = ":sent";
const DEBOUNCE_MS = 400;

function keyFor(
  sessionId: string | null,
  questionId: string | null,
): string | null {
  if (!sessionId || !questionId) return null;
  return `${PREFIX}${sessionId}:${questionId}`;
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Read a parked sent-draft. Versioned form is `{v:1, text, turnKey}` JSON;
 * legacy entries are plain strings (their turnKey is unknown — null), so an
 * existing user's parked copy still restores after an upgrade.
 */
function parseSentRecord(raw: string | null): (SentDraft & { legacy: boolean }) | null {
  if (!raw) return null;
  if (!raw.trimStart().startsWith("{")) {
    // Legacy plain-string draft from before the turn-key protocol.
    return raw.trim() ? { text: raw, turnKey: null, legacy: true } : null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "text" in parsed &&
      "turnKey" in parsed &&
      typeof parsed.text === "string" &&
      typeof parsed.turnKey === "string"
    ) {
      const record = parsed as { text: string; turnKey: string };
      return record.text.trim()
        ? { text: record.text, turnKey: record.turnKey, legacy: false }
        : null;
    }
  } catch {
    /* fall through: unreadable JSON is treated as absent */
  }
  return null;
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — autosave is best-effort */
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable — autosave is best-effort */
  }
}

/** What the client knows about the turn it sent, parked until confirmed. */
export interface SentDraft {
  /** The exact trimmed text that was SENT — not the storage snapshot. */
  text: string;
  /**
   * The turn_key it was sent under, so a confirmation can be matched. Null on
   * a legacy (pre-protocol) parked copy — it can never be confirmed and is
   * replaced by the next submit.
   */
  turnKey: string | null;
}

export interface UseDraftAutosaveResult {
  /**
   * The persisted answer for the current session+question, or null.
   *
   * Prefers a live draft over a sent-but-unconfirmed one: if the candidate has
   * started typing again, that is the text they care about.
   */
  restore: () => string | null;
  /**
   * The turn was acked. Park it as sent rather than deleting it.
   *
   * An ack is not durability — grading and the transcript write both come after
   * it — so the copy is held until the server CONFIRMS the turn (a snapshot
   * whose `confirmed_turn_key` matches).
   *
   * Takes the payload that was actually sent. Storage is a mirror of what the
   * composer held a moment ago; between a debounced write and a fast submit
   * they can differ, and the payload is the thing the server received — the
   * copy worth restoring is THAT text, not whatever the debounce last saw.
   */
  markSubmitted: (sent: SentDraft) => void;
  /**
   * Remove every copy — ONLY for this session+question, and only when the
   * server's confirmation names THIS turn. A snapshot that confirms a
   * different key (or none) must not clear anything: it carries no evidence
   * that this draft made it.
   */
  clearIfConfirmed: (args: { turnKey: string | null }) => void;
  /** Remove every copy unconditionally (results/finish cleanup). */
  clear: () => void;
}

export function useDraftAutosave(
  sessionId: string | null,
  questionId: string | null,
  draft: string,
): UseDraftAutosaveResult {
  const key = keyFor(sessionId, questionId);
  const timer = useRef<number | null>(null);

  // Debounced persist whenever the draft (or the key) changes.
  useEffect(() => {
    if (!key) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const trimmed = draft.trim();
      if (trimmed) {
        safeSet(key, draft);
      } else {
        safeRemove(key);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [key, draft]);

  const restore = useCallback((): string | null => {
    if (!key) return null;
    const live = safeGet(key);
    if (live && live.trim()) return live;
    // Nothing being typed — fall back to an answer that was sent but never
    // confirmed stored. Without this, an ack followed by a worker crash left the
    // candidate with an empty composer and no copy of what they had written.
    const sent = parseSentRecord(safeGet(`${key}${SENT_SUFFIX}`));
    return sent?.text ?? null;
  }, [key]);

  const markSubmitted = useCallback(
    (sent: SentDraft): void => {
      if (!key) return;
      // Cancel the pending debounce FIRST: it must not re-create the live key
      // (or overwrite the parked copy) after we moved the draft to `:sent`.
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      safeRemove(key);
      const text = sent.text.trim();
      if (text) {
        safeSet(
          `${key}${SENT_SUFFIX}`,
          JSON.stringify({ v: 1, text, turnKey: sent.turnKey } satisfies SentDraft & { v: 1 }),
        );
      }
    },
    [key],
  );

  const clearIfConfirmed = useCallback(
    ({ turnKey }: { turnKey: string | null }): void => {
      if (!key || !turnKey) return;
      // A confirmation names a turn. Only the matching turn's parked copy may
      // go: a snapshot confirming some OTHER key (the next question's answer,
      // an earlier probe) says nothing about this draft's durability. That
      // inference is exactly how a confirmed-draft copy got deleted while its
      // answer was still at risk.
      const parked = parseSentRecord(safeGet(`${key}${SENT_SUFFIX}`));
      if (!parked) {
        // Nothing parked for this question — also drop a live draft only when
        // the confirmation names THIS question's turn; there is nothing to do
        // otherwise.
        return;
      }
      if (parked.legacy || parked.turnKey === turnKey) {
        safeRemove(key);
        safeRemove(`${key}${SENT_SUFFIX}`);
      }
    },
    [key],
  );

  const clear = useCallback((): void => {
    if (!key) return;
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    safeRemove(key);
    safeRemove(`${key}${SENT_SUFFIX}`);
  }, [key]);

  return { restore, markSubmitted, clear, clearIfConfirmed };
}
