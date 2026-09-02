import { toast } from "sonner";
import type { TFunction } from "i18next";

import type { QuizQuestionAuthoring } from "@/lib/api/types";
import type { QuestionDraft } from "./types";

/**
 * Draft validation, PATCH payload assembly and the save handler for
 * QuestionCard, extracted so the card itself is pure composition. React-free:
 * the rules the backend enforces at publish time live here and can be reasoned
 * about without mounting a card.
 */

export interface QuestionDraftContext {
  draft: QuestionDraft;
  hasOptions: boolean;
  allowMultiCorrect: boolean;
}

/**
 * Parsed-not-merely-validated result: on success it hands back the expected
 * response time as a definite `number`, so the payload builder never has to
 * re-narrow the nullable draft field.
 */
export type QuestionDraftValidation =
  | { ok: true; expectedSeconds: number }
  | { ok: false; errorKey: string };

export function validateQuestionDraft({
  draft,
  hasOptions,
  allowMultiCorrect,
}: QuestionDraftContext): QuestionDraftValidation {
  if (!draft.prompt_text.trim()) {
    return {
      ok: false,
      errorKey: "teacher_quiz_manage.errors.prompt_required",
    };
  }
  // Expected response time is REQUIRED — the SR scheduler and pacing
  // analytics divide by it, so saving null/0 would produce a broken question
  // that the backend rejects at publish time anyway. Fail fast here with a
  // pointed message instead of letting it through to a publish-time 422.
  const expectedSeconds = draft.expected_response_seconds;
  if (
    expectedSeconds == null ||
    !Number.isFinite(expectedSeconds) ||
    expectedSeconds <= 0
  ) {
    return {
      ok: false,
      errorKey: "teacher_quiz_manage.errors.expected_time_required",
    };
  }
  if (hasOptions) {
    if (draft.options.some((o) => !o.option_text.trim())) {
      return {
        ok: false,
        errorKey: "teacher_quiz_manage.errors.option_text_required",
      };
    }
    // Phase 7: the correct-count rule depends on the multi-select toggle.
    // Multi-select needs >= 1 correct (matching the backend validator);
    // single-answer still requires exactly 1.
    const correctCount = draft.options.filter((o) => o.is_correct).length;
    if (allowMultiCorrect) {
      if (correctCount < 1) {
        return {
          ok: false,
          errorKey: "teacher_quiz_manage.errors.at_least_one_correct",
        };
      }
    } else if (correctCount !== 1) {
      return {
        ok: false,
        errorKey: "teacher_quiz_manage.errors.exactly_one_correct",
      };
    }
  }
  return { ok: true, expectedSeconds };
}

export interface QuestionPatchInput extends QuestionDraftContext {
  question: QuizQuestionAuthoring;
  reviewStatus: string;
  expectedSeconds: number;
}

/** Rebuild the fill_blank word bank from the blanks + the distractor list:
 *  correct entries (deduped case-insensitively, is_correct=true) first, then
 *  distractors (is_correct=false). Mirrors the AI generator's
 *  `_normalize_fill_blank_options`. */
function buildFillBlankOptions(
  correct: string | string[] | null,
  distractors: string[],
): Array<{ option_key: string; option_text: string; is_correct: boolean }> {
  const blanks = (Array.isArray(correct) ? correct : [])
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
  const options: Array<{
    option_key: string;
    option_text: string;
    is_correct: boolean;
  }> = [];
  const seen = new Set<string>();
  let n = 0;
  const push = (text: string, isCorrect: boolean) => {
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    n += 1;
    options.push({
      option_key: `O${String(n).padStart(2, "0")}`,
      option_text: text,
      is_correct: isCorrect,
    });
  };
  blanks.forEach((b) => push(b, true));
  distractors.forEach((d) => {
    const text = d.trim();
    if (text) push(text, false);
  });
  return options;
}

export function buildQuestionPatch({
  draft,
  question,
  hasOptions,
  reviewStatus,
  expectedSeconds,
}: QuestionPatchInput): Record<string, unknown> {
  return {
    prompt_text: draft.prompt_text.trim(),
    hint_text: draft.hint_text.trim() || null,
    explanation: draft.explanation.trim() || null,
    difficulty: draft.difficulty,
    // bloom_level and expected_ef_ceiling are no longer teacher-editable
    // (removed from the question editor). This is a partial PATCH, so
    // omitting them leaves any existing backend values untouched.
    // Validated as required above, so this is always a positive integer.
    expected_response_time_ms: Math.max(1, Math.round(expectedSeconds)) * 1000,
    review_status: reviewStatus,
    learning_outcome_id: draft.learning_outcome_id || null,
    ...(hasOptions
      ? {
          options: draft.options.map((o) => ({
            id: o.id,
            option_key: o.option_key,
            option_text: o.option_text.trim(),
            is_correct: o.is_correct,
          })),
        }
      : {}),
    // Phase 7: type-specific answer fields. Sent per question type so the
    // backend persists the answer key (numerical/matching/ordering) or the
    // multi-select discriminator (multiple_choice). Omitted for types that
    // don't use them, leaving existing values untouched (partial PATCH).
    ...(question.question_type === "multiple_choice"
      ? { single_answer: draft.single_answer }
      : {}),
    ...(question.question_type === "numerical"
      ? {
          numeric_answer:
            draft.numeric_answer.trim() === ""
              ? null
              : Number(draft.numeric_answer),
          numeric_tolerance:
            draft.numeric_tolerance.trim() === ""
              ? 0
              : Number(draft.numeric_tolerance),
        }
      : {}),
    ...(question.question_type === "matching"
      ? {
          match_pairs: draft.match_pairs
            .filter((p) => p.left.trim() && p.right.trim())
            .map((p) => ({ left: p.left.trim(), right: p.right.trim() })),
          // Distractors: extra unpaired choices. Trimmed + de-blanked; sent
          // even when empty so clearing them all reverts to 1:1 matching.
          match_distractors: draft.match_distractors
            .map((d) => d.trim())
            .filter((d) => d.length > 0),
        }
      : {}),
    ...(question.question_type === "ordering"
      ? {
          ordering_sequence: draft.ordering_sequence
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
        }
      : {}),
    // short_answer keeps its answer inside original_generated_payload.correct_answer
    // (the same slot the AI generator writes), merged over whatever was stored.
    ...(question.question_type === "short_answer"
      ? {
          original_generated_payload: {
            ...(question.original_generated_payload ?? {}),
            correct_answer: draft.correct_answer,
          },
        }
      : {}),
    // fill_blank keeps its answer the same way AND sends the reconstructed word
    // bank (correct answers + teacher-edited distractors) as options, so the
    // teacher can declare/remove distractors like matching.
    ...(question.question_type === "fill_blank"
      ? {
          original_generated_payload: {
            ...(question.original_generated_payload ?? {}),
            correct_answer: draft.correct_answer,
          },
          options: buildFillBlankOptions(
            draft.correct_answer,
            draft.fill_blank_distractors,
          ),
        }
      : {}),
  };
}

export interface QuestionSaverDeps extends QuestionDraftContext {
  question: QuizQuestionAuthoring;
  t: TFunction;
  patchQuestion: (payload: Record<string, unknown>) => Promise<unknown>;
}

/**
 * One card's save function.
 *
 * Resolves TRUE only when the row was actually written. The quiz-level save
 * bar runs these in a batch and has to know: this function reports both a
 * failed validation and a failed PATCH by toasting rather than throwing, so a
 * caller that only awaited it would count a rejected question as saved and
 * then claim the batch succeeded.
 *
 * `silent` suppresses only the SUCCESS toast, for the batch case — twenty
 * questions saved one after another should produce one "20 questions saved",
 * not twenty. Failures always toast, because the teacher needs to know which
 * question stopped the run.
 */
export type QuestionSaver = (
  reviewStatus?: string,
  options?: { silent?: boolean },
) => Promise<boolean>;

/**
 * Build the card's save handler: validate the draft, PATCH it, toast the
 * outcome. Recreated on every render exactly like the inline function
 * declaration it replaced, so the closure always sees the current draft.
 */
export function createQuestionSaver({
  draft,
  question,
  hasOptions,
  allowMultiCorrect,
  t,
  patchQuestion,
}: QuestionSaverDeps): QuestionSaver {
  return async function handleSave(
    reviewStatus = draft.review_status,
    options = {},
  ) {
    const validation = validateQuestionDraft({
      draft,
      hasOptions,
      allowMultiCorrect,
    });
    if (!validation.ok) {
      toast.error(t(validation.errorKey));
      return false;
    }
    try {
      await patchQuestion(
        buildQuestionPatch({
          draft,
          question,
          hasOptions,
          allowMultiCorrect,
          reviewStatus,
          expectedSeconds: validation.expectedSeconds,
        }),
      );
      if (!options.silent) {
        toast.success(
          reviewStatus === "approved"
            ? t("teacher_quiz_manage.toasts.question_approved")
            : t("teacher_quiz_manage.toasts.question_saved"),
        );
      }
      return true;
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.save_question_failed"),
      );
      return false;
    }
  };
}
