import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichContent } from "@/components/ui/rich-content";
import { QuestionRenderer } from "@/routes/_components/QuestionRenderer";
import type { ReviewCard, ReviewSubmitResult } from "@/lib/api/types";
import { ReviewFeedback, ReviewHintBlock } from "./ReviewCardBlocks";
import { useReviewCard, type ReviewCardController } from "./use-review-card";

/** Submit (before grading) / Next card (after). */
function ReviewCardAction({
  controller,
  onNext,
  isLast,
}: {
  controller: ReviewCardController;
  onNext: () => void;
  isLast: boolean;
}) {
  const { t, graded, hasAnswer, submitting, handleSubmit } = controller;

  return (
    <div className="flex justify-end">
      {!graded ? (
        <Button
          onClick={handleSubmit}
          disabled={!hasAnswer || submitting}
          className="gap-2 cursor-pointer"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("study_review.submit", "Submit")}
        </Button>
      ) : (
        <Button onClick={onNext} className="gap-2 cursor-pointer">
          {isLast
            ? t("study_review.finish", "Finish")
            : t("study_review.next", "Next card")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * One flashcard: course/lesson context, prompt, answer input, optional hint,
 * post-grade feedback and the submit/next action. State lives in
 * {@link useReviewCard}.
 */
export function ReviewCardView({
  card,
  index,
  onResolved,
  onNext,
  isLast,
}: {
  card: ReviewCard;
  index: number;
  onResolved: (result: ReviewSubmitResult) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const controller = useReviewCard(card, onResolved);
  const {
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
    graded,
  } = controller;

  return (
    <div className="bg-m3-surface-container-lowest rounded-2xl ghost-border shadow-editorial p-6 sm:p-8 space-y-5">
      {/* Course + lesson context (the thing the old screen was missing) */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="font-bold px-2 py-0.5 rounded-full bg-m3-primary-fixed text-m3-primary">
          {card.course_title}
        </span>
        <span className="text-m3-on-surface-variant">{card.lesson_title}</span>
      </div>

      {/* Prompt — Q number + heading, matching the quiz-taking card. */}
      <div className="pt-1">
        <span className="text-m3-secondary font-headline font-bold text-[11px] tracking-widest uppercase mb-2 block">
          Q{index + 1}
        </span>
        <h2 className="text-lg sm:text-xl font-headline font-bold text-m3-on-surface leading-snug">
          <RichContent
            value={card.question.prompt_text}
            format={
              (card.question as { prompt_format?: string }).prompt_format ??
              "plain"
            }
          />
        </h2>
      </div>

      {/* Answer input (reuses the quiz-taking renderer for every type) */}
      <QuestionRenderer
        question={card.question}
        selectedOptionId={selectedOptionId}
        answerText={answerText}
        disabled={graded || submitting}
        onSelectOption={(id) => !graded && setSelectedOptionId(id)}
        onAnswerTextChange={(v) => !graded && setAnswerText(v)}
      />

      {hintText && !graded && (
        <ReviewHintBlock
          hintText={hintText}
          hintFormat={hintFormat}
          hintShown={hintShown}
          onShowHint={() => setHintShown(true)}
        />
      )}

      {result !== null && <ReviewFeedback result={result} />}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Action */}
      <ReviewCardAction
        controller={controller}
        onNext={onNext}
        isLast={isLast}
      />
    </div>
  );
}
