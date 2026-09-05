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

export interface UseDraftAutosaveResult {
  /**
   * The persisted answer for the current session+question, or null.
   *
   * Prefers a live draft over a sent-but-unconfirmed one: if the candidate has
   * started typing again, that is the text they care about.
   */
  restore: () => string | null;
  /**
   * The turn was acked. Park the draft as sent rather than deleting it.
   *
   * An ack is not durability — grading and the transcript write both come after
   * it — so the copy is held until the answer is seen in the server's transcript.
   */
  markSubmitted: () => void;
  /** Remove every copy. Call only once the answer is confirmed server-side. */
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
    const sent = safeGet(`${key}${SENT_SUFFIX}`);
    return sent && sent.trim() ? sent : null;
  }, [key]);

  const markSubmitted = useCallback((): void => {
    if (!key) return;
    // The debounced write may still be pending, so take the text from storage
    // AND fall back to the current draft — otherwise a fast submit (typed, sent
    // inside the 400ms window) would park nothing at all.
    const pending = safeGet(key) ?? draft;
    if (pending && pending.trim()) {
      safeSet(`${key}${SENT_SUFFIX}`, pending);
    }
    safeRemove(key);
  }, [key, draft]);

  const clear = useCallback((): void => {
    if (!key) return;
    safeRemove(key);
    safeRemove(`${key}${SENT_SUFFIX}`);
  }, [key]);

  return { restore, markSubmitted, clear };
}
