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
