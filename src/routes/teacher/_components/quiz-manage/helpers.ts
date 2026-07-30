import type { QuizAuthoring, QuizQuestionAuthoring } from "@/lib/api/types";
import { defaultReviewOptions } from "./ReviewOptionsMatrix";
import type { QuestionDraft, SettingsDraft } from "./types";

/**
 * Pure helpers for the quiz-manage screen, extracted from the former
 * 3.5k-line quiz-manage.tsx. Kept free of React so they can be unit-tested
 * directly and shared between the page shell, the tabs, and the navigator
 * without any component owning the definition.
 */

// Default expected response time (seconds) pre-filled on questions that don't
// have one set, so teachers start from a sensible value instead of blank.
export const DEFAULT_EXPECTED_SECONDS = 60;

export function toDraftString(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

/**
 * Convert a server ISO-8601 UTC instant to the local-time value a
 * `datetime-local` input expects ("YYYY-MM-DDTHH:mm"). Returns "" for
 * null/empty/invalid so an unset window renders as a blank field.
 */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/**
 * Convert a `datetime-local` value (local time) back to an ISO-8601 UTC
 * string for the API, or null when blank. The Date ctor interprets the
 * bare local string in the browser's zone, and toISOString normalises to UTC.
 */
export function localInputToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function integerOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

export function decimalOrNull(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number.isFinite(Number(trimmed)) ? trimmed : null;
}

export function draftFromQuiz(quiz: QuizAuthoring): SettingsDraft {
  const passingNum = Number(quiz.passing_score_percent ?? 70);
  return {
    title: quiz.title ?? "",
    description: quiz.description ?? "",
    time_limit_minutes:
      quiz.time_limit_seconds == null
        ? ""
        : String(Math.max(1, Math.round(quiz.time_limit_seconds / 60))),
    passing_score_percent: Number.isFinite(passingNum)
      ? Math.max(0, Math.min(100, Math.round(passingNum)))
      : 70,
    max_attempts: toDraftString(quiz.max_attempts),
    cooldown_hours: toDraftString(quiz.cooldown_hours),
    initial_ef: toDraftString(quiz.initial_ef),
    min_ef_for_unlock: toDraftString(quiz.min_ef_for_unlock),
    coverage_threshold: toDraftString(quiz.coverage_threshold),
    allow_retakes: quiz.allow_retakes,
    shuffle_questions: quiz.shuffle_questions,
    shuffle_options: quiz.shuffle_options,
    show_hints: quiz.show_hints,
    reminders_enabled: quiz.reminders_enabled,
    grading_method: quiz.grading_method ?? "highest",
    available_from: isoToLocalInput(quiz.available_from),
    available_until: isoToLocalInput(quiz.available_until),
    due_at: isoToLocalInput(quiz.due_at),
    review_options: quiz.review_options ?? defaultReviewOptions(),
    require_password: quiz.require_password ?? "",
    require_subnet: quiz.require_subnet ?? "",
    browser_security: quiz.browser_security ?? false,
    overdue_handling: quiz.overdue_handling ?? "autosubmit",
    grace_period_seconds: toDraftString(quiz.grace_period_seconds),
  };
}

export function readCorrectAnswer(
  question: QuizQuestionAuthoring,
): string | string[] | null {
  const payload = question.original_generated_payload as
    | { correct_answer?: unknown }
    | null
    | undefined;
  const raw = payload?.correct_answer;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.map((entry) => String(entry));
  return null;
}

export function countBlanks(promptText: string): number {
  const matches = promptText.match(/_{3,}/g);
  return matches ? matches.length : 0;
}

/**
 * Is this question's expected response time missing/invalid?
 *
 * The expected response time is REQUIRED: the spaced-repetition scheduler and
 * the pacing analytics both divide by it, so a null or non-positive value is a
 * broken question, not merely an incomplete one. A question can be pruned to
 * null by the AI generator or cleared by hand, so this is checked on the saved
 * row (what the backend will reject at publish) rather than on the draft.
 */

export function hasInvalidExpectedTime(
  question: QuizQuestionAuthoring,
): boolean {
  const ms = question.expected_response_time_ms;
  return ms == null || ms <= 0;
}

/**
 * Per-question status shown in the navigator.
 *
 * These are ORTHOGONAL layers, not one enum — a question can be approved AND
 * unsaved AND focused at once. The navigator renders them on separate visual
 * channels so they never collide:
 *
 *   error      → red fill            (invalid/missing expected time; blocks publish)
 *   approved   → primary fill        (review_status === "approved")
 *   pending    → neutral fill + amber dot (awaiting review)
 *   unsaved    → amber ring + pencil corner (local edits not yet PATCHed)
 *   selected   → checkbox tick badge (bulk-action selection)
 *   focused    → primary ring + scale (scroll-spy / just-clicked)
 *
 * Precedence applies only to the FILL (a cell has one background): error wins
 * over approved wins over pending, because error is the state that blocks
 * publishing and must never be masked by an approved fill.
 */

export function buildQuestionDraft(
  question: QuizQuestionAuthoring,
): QuestionDraft {
  return {
    prompt_text: question.prompt_text ?? "",
    hint_text: question.hint_text ?? "",
    explanation: question.explanation ?? "",
    difficulty: question.difficulty ?? "medium",
    // Default the expected response time to DEFAULT_EXPECTED_SECONDS when the
    // question has none, so new/AI-generated questions come pre-filled with a
    // sensible value instead of blank (teachers can still override or clear).
    expected_response_seconds:
      question.expected_response_time_ms == null
        ? DEFAULT_EXPECTED_SECONDS
        : Math.round(question.expected_response_time_ms / 1000),
    review_status: question.review_status ?? "pending",
    learning_outcome_id: question.learning_outcome_id ?? null,
    options: (question.options ?? []).map((o) => ({
      id: o.id,
      option_key: o.option_key,
      option_text: o.option_text,
      is_correct: o.is_correct,
    })),
    // Phase 7: type-specific answer fields (teacher-only; served on the
    // authoring schema). Held as strings in the draft for easy input binding.
    single_answer: question.single_answer ?? true,
    numeric_answer:
      question.numeric_answer == null ? "" : String(question.numeric_answer),
    numeric_tolerance:
      question.numeric_tolerance == null
        ? ""
        : String(question.numeric_tolerance),
    match_pairs: Array.isArray(question.match_pairs)
      ? question.match_pairs.map((p) => ({
          left: String(p.left ?? ""),
          right: String(p.right ?? ""),
        }))
      : [],
    ordering_sequence: Array.isArray(question.ordering_sequence)
      ? question.ordering_sequence.map((s) => String(s))
      : [],
  };
}

/* GenerateModal removed: the AI generator is now its own full-page route
   (src/routes/teacher/quiz-generate.tsx) reached via onOpenGenerator, since
   the form outgrew the dialog. QuizGenerationPanel is imported by that page. */

/**
 * A `<fieldset disabled>` wrapper for the sections frozen once published.
 * Grouping each locked SettingsSection in one of these disables every control
 * inside without threading `disabled` onto each input. When not locked it
 * renders a transparent passthrough so draft editing is unaffected.
 *
 * Declared at module scope on purpose. Nested inside SettingsTab, every
 * re-render created a NEW component function, so React saw a different element
 * type and remounted the whole subtree — discarding local state in children
 * (e.g. the review-options expand/collapse) on every keystroke or toggle.
 */
