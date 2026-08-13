/**
 * Same-device persistence for per-question "first seen" timestamps of an
 * in-progress quiz attempt.
 *
 * The per-question elapsed badge and the ``t_actual_ms`` we report to the
 * server both derive from *when the student first landed on that question*.
 * That anchor lived only in an in-memory ref (`questionSeenAtRef`), so a
 * refresh (F5), tab close, or crash reset it to "now" and the timer visibly
 * restarted from 00:00/00:01 instead of counting from the real first view.
 *
 * We mirror ``{ questionId: epochMs }`` into localStorage keyed by attempt id
 * so a resumed attempt keeps counting from the original first-seen time.
 * Best-effort: any storage error (quota, private mode, disabled) is swallowed
 * — this is an accuracy enhancement, never a correctness dependency.
 */

const KEY_PREFIX = "abridgeai.quiztiming.";

/** `{ [questionId]: epochMillisWhenFirstSeen }` for one attempt. */
export type QuizSeenAt = Record<string, number>;

function keyFor(attemptId: string): string {
  return `${KEY_PREFIX}${attemptId}`;
}

export function loadSeenAt(attemptId: string): QuizSeenAt {
  try {
    const raw = window.localStorage.getItem(keyFor(attemptId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    // Keep only finite positive numbers — guard against corrupted entries.
    const out: QuizSeenAt = {};
    for (const [qid, ts] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof ts === "number" && Number.isFinite(ts) && ts > 0) {
        out[qid] = ts;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveSeenAt(attemptId: string, seenAt: QuizSeenAt): void {
  try {
    window.localStorage.setItem(keyFor(attemptId), JSON.stringify(seenAt));
  } catch {
    // Quota exceeded / storage disabled — timing mirror is best-effort.
  }
}

export function clearSeenAt(attemptId: string): void {
  try {
    window.localStorage.removeItem(keyFor(attemptId));
    // Focus totals are attempt-scoped, so they go too. The page-size
    // preference deliberately does NOT: it's a per-device reading choice that
    // must survive finishing an attempt.
    window.localStorage.removeItem(focusKeyFor(attemptId));
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------------- *
 * Accumulated per-question FOCUS time (attention model)
 *
 * Deliberately a separate store from the first-seen anchors above: those are
 * timestamps ("when did they land on it"), these are durations ("how long did
 * they attend to it"). Mixing the two shapes in one key would make a
 * half-migrated attempt unreadable, so they live side by side and are cleared
 * together when an attempt finishes.
 * ------------------------------------------------------------------------- */

const FOCUS_PREFIX = "abridgeai.quizfocus.";

/** `{ [questionId]: accumulatedFocusMs }` for one attempt. */
export type QuizFocusMs = Record<string, number>;

function focusKeyFor(attemptId: string): string {
  return `${FOCUS_PREFIX}${attemptId}`;
}

export function loadFocusMs(attemptId: string): QuizFocusMs {
  try {
    const raw = window.localStorage.getItem(focusKeyFor(attemptId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: QuizFocusMs = {};
    for (const [qid, ms] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof ms === "number" && Number.isFinite(ms) && ms >= 0) {
        out[qid] = ms;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveFocusMs(attemptId: string, focus: QuizFocusMs): void {
  try {
    window.localStorage.setItem(focusKeyFor(attemptId), JSON.stringify(focus));
  } catch {
    // best-effort
  }
}

/* ------------------------------------------------------------------------- *
 * Questions-per-page preference
 * ------------------------------------------------------------------------- */

/** Questions shown per page. "all" renders the whole quiz on one screen. */
export type QuizPageSize = 1 | 5 | 10 | "all";

export const QUIZ_PAGE_SIZES: readonly QuizPageSize[] = [1, 5, 10, "all"];

const PAGE_SIZE_KEY = "abridgeai.quizpagesize";

/**
 * The preference is per-device rather than per-attempt: it's a reading-comfort
 * choice ("I like seeing 10 at a time"), not attempt state, so it should carry
 * over to the student's next quiz.
 */
export function loadPageSize(): QuizPageSize {
  try {
    const raw = window.localStorage.getItem(PAGE_SIZE_KEY);
    if (raw === "all") return "all";
    const n = Number(raw);
    if (n === 1 || n === 5 || n === 10) return n;
    return 1;
  } catch {
    return 1;
  }
}

export function savePageSize(size: QuizPageSize): void {
  try {
    window.localStorage.setItem(PAGE_SIZE_KEY, String(size));
  } catch {
    // best-effort
  }
}

/* ------------------------------------------------------------------------- *
 * Add-question default type (authoring)
 *
 * The Add-question split button remembers the last type the teacher chose from
 * its dropdown and makes it the primary click for next time — so someone
 * authoring a matching quiz isn't forced back through the menu on every add.
 * Per-device, like the page-size preference: an authoring-comfort choice, not
 * quiz state, so it carries across quizzes.
 * ------------------------------------------------------------------------- */

/** Manual question types the Add-question control can seed. */
export type AddQuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "numerical"
  | "matching"
  | "ordering"
  | "fill_blank";

const ADD_QUESTION_TYPES: readonly AddQuestionType[] = [
  "multiple_choice",
  "true_false",
  "short_answer",
  "numerical",
  "matching",
  "ordering",
  "fill_blank",
];

const ADD_QUESTION_TYPE_KEY = "abridgeai.addquestiontype";

export function loadAddQuestionType(): AddQuestionType {
  try {
    const raw = window.localStorage.getItem(ADD_QUESTION_TYPE_KEY);
    if (raw && (ADD_QUESTION_TYPES as readonly string[]).includes(raw)) {
      return raw as AddQuestionType;
    }
    return "multiple_choice";
  } catch {
    return "multiple_choice";
  }
}

export function saveAddQuestionType(type: AddQuestionType): void {
  try {
    window.localStorage.setItem(ADD_QUESTION_TYPE_KEY, type);
  } catch {
    // best-effort
  }
}
