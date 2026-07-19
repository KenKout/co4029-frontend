/**
 * Same-device draft mirror for an in-progress quiz attempt.
 *
 * Committed answers live on the server (cross-device, authoritative). This
 * localStorage draft is the local safety net for the two things the server
 * does NOT hold mid-attempt:
 *
 *  1. FLAGS — a student can flag an unanswered question, which has no server
 *     answer row to attach to, and we don't want flag-only writes creating
 *     rows that pollute grading / SM-2. So flags live only here.
 *  2. The single UNSAVED in-flight answer — answers save to the server on
 *     navigation (Next / Previous / jump). If the student selects/types and
 *     then crashes BEFORE navigating, that one change never reached the
 *     server. The draft captures it so resume can recover it too.
 *
 * Keyed by attempt id so concurrent attempts (unlikely, but safe) don't
 * clobber each other. Cleared on submit. Best-effort: any storage error
 * (quota, private mode, disabled) is swallowed — the draft is an
 * enhancement, never a correctness dependency.
 */

const KEY_PREFIX = "abridgeai.quizdraft.";

export interface QuizDraftEntry {
  selectedOptionId: string | null;
  answerText: string | null;
  flagged: boolean;
  hintViewed: boolean;
  /** Local answer changed but not yet confirmed saved to the server. */
  dirty: boolean;
}

/** Draft for one attempt: per-question state keyed by question id. */
export type QuizDraft = Record<string, QuizDraftEntry>;

function keyFor(attemptId: string): string {
  return `${KEY_PREFIX}${attemptId}`;
}

export function loadQuizDraft(attemptId: string): QuizDraft | null {
  try {
    const raw = window.localStorage.getItem(keyFor(attemptId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as QuizDraft;
  } catch {
    return null;
  }
}

export function saveQuizDraft(attemptId: string, draft: QuizDraft): void {
  try {
    window.localStorage.setItem(keyFor(attemptId), JSON.stringify(draft));
  } catch {
    // Quota exceeded / storage disabled — draft is best-effort, ignore.
  }
}

export function clearQuizDraft(attemptId: string): void {
  try {
    window.localStorage.removeItem(keyFor(attemptId));
  } catch {
    // ignore
  }
}
