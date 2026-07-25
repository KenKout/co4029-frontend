import { useCallback, useEffect, useRef } from "react";

/**
 * Answer-draft autosave (resilience A-Tier-1 #2).
 *
 * The interview composer's text lives only in React state, so a tab crash,
 * accidental navigation, or reload mid-question loses a half-typed answer. This
 * hook mirrors the current draft into `localStorage`, keyed by session +
 * question, and exposes a one-shot `restore` + an explicit `clear` for the
 * submit path.
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
  /** Read the persisted draft for the current session+question (or null). */
  restore: () => string | null;
  /** Remove the persisted draft (call on successful submit). */
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
    const value = safeGet(key);
    return value && value.trim() ? value : null;
  }, [key]);

  const clear = useCallback((): void => {
    if (!key) return;
    safeRemove(key);
  }, [key]);

  return { restore, clear };
}
