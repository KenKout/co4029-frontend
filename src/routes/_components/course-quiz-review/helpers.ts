import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type { QuizAttemptReviewQuestion } from "@/lib/api/types";

/** mm:ss for the attempt's total time, "—" when the server sent none. */
export function formatTime(totalSeconds: number | null | undefined) {
  if (totalSeconds == null) return "—";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Correct / incorrect / skipped tallies across the reviewed questions. */
export function computeReviewStats(questions: QuizAttemptReviewQuestion[]) {
  const total = questions.length;
  const correct = questions.filter((q) => q.is_correct).length;
  const skipped = questions.filter(
    (q) => !q.selected_option_id && !q.answer_text,
  ).length;
  return { total, correct, incorrect: total - correct - skipped, skipped };
}

export type ReviewStats = ReturnType<typeof computeReviewStats>;

export interface QuestionBadge {
  icon: typeof CheckCircle2;
  label: string;
  cls: string;
}

/**
 * The per-question verdict badge. Correct wins over skipped wins over
 * incorrect, exactly as the if/else chain this replaces did.
 */
export function questionBadge(
  question: QuizAttemptReviewQuestion,
  t: (key: string) => string,
): QuestionBadge {
  const wasSkipped =
    !question.selected_option_id && !question.answer_text?.trim();

  if (question.is_correct) {
    return {
      icon: CheckCircle2,
      label: t("course_quiz_review.correct"),
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (wasSkipped) {
    return {
      icon: HelpCircle,
      label: t("course_quiz_review.skipped"),
      cls: "bg-m3-surface-container text-m3-on-surface-variant border-m3-outline-variant/40",
    };
  }
  return {
    icon: XCircle,
    label: t("course_quiz_review.incorrect"),
    cls: "bg-red-50 text-red-700 border-red-200",
  };
}

export interface OptionVerdict {
  cls: string;
  labelKey: string | null;
  LabelIcon: typeof CheckCircle2 | null;
}

/** Styling + label for one answer option, given whether it was picked. */
export function optionVerdict(
  isCorrect: boolean,
  selected: boolean,
): OptionVerdict {
  if (selected && isCorrect) {
    return {
      cls: "bg-emerald-50 border-emerald-300",
      labelKey: "course_quiz_review.option.your_correct",
      LabelIcon: CheckCircle2,
    };
  }
  if (selected && !isCorrect) {
    return {
      cls: "bg-red-50 border-red-300",
      labelKey: "course_quiz_review.option.your_incorrect",
      LabelIcon: XCircle,
    };
  }
  if (isCorrect) {
    return {
      cls: "bg-emerald-50/60 border-emerald-200 border-dashed",
      labelKey: "course_quiz_review.option.correct",
      LabelIcon: CheckCircle2,
    };
  }
  return {
    cls: "bg-m3-surface-container-low border-m3-outline-variant/20",
    labelKey: null,
    LabelIcon: null,
  };
}
