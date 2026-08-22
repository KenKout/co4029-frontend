import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { submitReview } from "@/lib/api/hooks/spaced-repetition";
import type { ReviewCard, ReviewSubmitResult } from "@/lib/api/types";

/**
 * Local answer state for one review card plus the grade submission, lifted
 * verbatim out of ReviewCardView. `t` is returned rather than re-acquired in
 * the view so the component keeps exactly one `useTranslation` call, in its
 * original position ahead of the state hooks.
 */
export function useReviewCard(
  card: ReviewCard,
  onResolved: (result: ReviewSubmitResult) => void,
) {
  const { t } = useTranslation();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReviewSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track real hint usage — the quiz-taking path does the same, and the SM-2
  // Q grade depends on it (correct WITH hint → Q∈{1,2}, WITHOUT → Q∈{3,4,5}).
  // Hardcoding false here would grade a review card on a different scale than
  // the exact same card answered inside a quiz.
  const [hintShown, setHintShown] = useState(false);
  const startedAt = useRef<number>(Date.now());

  const hintText = (card.question as { hint_text?: string | null }).hint_text;
  const hintFormat =
    (card.question as { hint_format?: string }).hint_format ?? "plain";

  const hasAnswer =
    selectedOptionId !== null || (answerText ?? "").trim().length > 0;
  const graded = result !== null;

  async function handleSubmit() {
    if (!hasAnswer || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitReview(card.question_id, {
        selected_option_id: selectedOptionId,
        answer_text: answerText,
        hint_used: hintShown,
        t_actual_ms: Date.now() - startedAt.current,
      });
      setResult(res);
      onResolved(res);
    } catch {
      setError(t("study_review.submit_failed", "Couldn't submit — try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return {
    t,
    selectedOptionId,
    setSelectedOptionId,
    answerText,
    setAnswerText,
    submitting,
    result,
    error,
    hintShown,
    setHintShown,
    hintText,
    hintFormat,
    hasAnswer,
    graded,
    handleSubmit,
  };
}

export type ReviewCardController = ReturnType<typeof useReviewCard>;
