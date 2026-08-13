import {
  decimalOrNull,
  integerOrNull,
  localInputToIso,
} from "@/routes/teacher/_components/quiz-manage/helpers";
import type { SettingsDraft } from "@/routes/teacher/_components/quiz-manage/types";

import type { TranslateFn } from "./types";

/**
 * Payload builders for the quiz-manage page shell, extracted verbatim from
 * quiz-manage.tsx. Pure functions — no React, no side effects — so the async
 * handlers stay short and each payload shape can be reasoned about alone.
 */

/**
 * Phase 7: seed the right shape per type. MCQ/T-F seed option rows; the
 * expanded types seed their own answer fields (edited in the card after).
 *
 * A lookup table replaces the original `switch`: same six branches, same
 * payloads, same key order (base first, then the type-specific extras).
 */
const QUESTION_SEEDS: Record<
  string,
  (base: Record<string, unknown>, t: TranslateFn) => Record<string, unknown>
> = {
  true_false: (base) => ({
    ...base,
    options: [
      { option_key: "T", option_text: "True", is_correct: true },
      { option_key: "F", option_text: "False", is_correct: false },
    ],
  }),
  short_answer: (base) => ({ ...base }),
  // Seed a prompt that already contains ___ markers so the card's per-blank
  // answer inputs are visible right after creation (blank count = markers).
  fill_blank: (base, t) => ({
    ...base,
    prompt_text: t("teacher_quiz_manage.new_question.fill_blank_prompt"),
  }),
  numerical: (base) => ({ ...base, numeric_answer: 0, numeric_tolerance: 0 }),
  matching: (base) => ({
    ...base,
    match_pairs: [
      { left: "Term 1", right: "Match 1" },
      { left: "Term 2", right: "Match 2" },
    ],
    // Distractors start empty — classic 1:1 matching until the teacher adds
    // extra unpaired choices in the card editor.
    match_distractors: [],
  }),
  ordering: (base) => ({
    ...base,
    ordering_sequence: ["First", "Second", "Third"],
  }),
};

/** The `default` switch arm: multiple choice with four seeded options. */
function multipleChoiceSeed(
  base: Record<string, unknown>,
  t: TranslateFn,
): Record<string, unknown> {
  return {
    ...base,
    options: [
      {
        option_key: "A",
        option_text: t("teacher_quiz_manage.new_question.option_a"),
        is_correct: true,
      },
      {
        option_key: "B",
        option_text: t("teacher_quiz_manage.new_question.option_b"),
        is_correct: false,
      },
      {
        option_key: "C",
        option_text: t("teacher_quiz_manage.new_question.option_c"),
        is_correct: false,
      },
      {
        option_key: "D",
        option_text: t("teacher_quiz_manage.new_question.option_d"),
        is_correct: false,
      },
    ],
  };
}

export function buildNewQuestionPayload(
  questionType: string,
  t: TranslateFn,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    question_type: questionType,
    prompt_text: t("teacher_quiz_manage.new_question.prompt"),
    explanation: t("teacher_quiz_manage.new_question.explanation"),
    difficulty: "medium",
    bloom_level: "understand",
  };
  const seed = QUESTION_SEEDS[questionType] ?? multipleChoiceSeed;
  return seed(base, t);
}

/**
 * The Save-settings PATCH body. Minutes in the form become whole seconds on
 * the wire; blank access rules become `null` so the backend clears them.
 */
export function settingsPatchFromDraft(
  draft: SettingsDraft,
): Record<string, unknown> {
  const minutesRaw = draft.time_limit_minutes.trim();
  const timeLimitSeconds = minutesRaw
    ? Math.max(0, Math.round(Number(minutesRaw) * 60))
    : null;
  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    time_limit_seconds: timeLimitSeconds,
    passing_score_percent: String(draft.passing_score_percent),
    max_attempts: integerOrNull(draft.max_attempts),
    cooldown_hours: integerOrNull(draft.cooldown_hours),
    initial_ef: decimalOrNull(draft.initial_ef),
    min_ef_for_unlock: decimalOrNull(draft.min_ef_for_unlock),
    coverage_threshold: decimalOrNull(draft.coverage_threshold),
    allow_retakes: draft.allow_retakes,
    shuffle_questions: draft.shuffle_questions,
    shuffle_options: draft.shuffle_options,
    show_hints: draft.show_hints,
    reminders_enabled: draft.reminders_enabled,
    grading_method: draft.grading_method,
    available_from: localInputToIso(draft.available_from),
    available_until: localInputToIso(draft.available_until),
    due_at: localInputToIso(draft.due_at),
    review_options: draft.review_options,
    require_password: draft.require_password.trim() || null,
    require_subnet: draft.require_subnet.trim() || null,
    browser_security: draft.browser_security,
    overdue_handling: draft.overdue_handling,
    grace_period_seconds: integerOrNull(draft.grace_period_seconds),
  };
}
