import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuizAttemptReview, useStudentQuiz } from "@/lib/api/hooks/quizzes";
import { setScrollToTopBump } from "@/components/ui/scroll-to-top";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { ReviewNavDialog } from "@/routes/_components/course-quiz-review/ReviewNavDialog";
import { ReviewQuestionCard } from "@/routes/_components/course-quiz-review/ReviewQuestionCard";
import {
  QuizReviewNotFound,
  QuizReviewSkeleton,
  ReviewActionsBar,
  ReviewOverallFeedback,
  ReviewScoreSummary,
} from "@/routes/_components/course-quiz-review/ReviewSummary";

/**
 * Post-submission attempt review. Compact result card (score bar against the
 * passing score + attempt info) followed by the per-question breakdown; the
 * question navigator lives in a dialog opened from the sticky breakdown
 * button (mobile) / inline actions (desktop). Retry is offered only when the
 * quiz allows further attempts.
 */
export default function CourseQuizReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug, quizId, attemptId } = useParams({ strict: false }) as {
    slug: string;
    quizId: string;
    attemptId: string;
  };

  const { data: quiz } = useStudentQuiz(quizId);
  const { data: review, isLoading, isError } = useQuizAttemptReview(attemptId);
  const [navOpen, setNavOpen] = useState(false);
  const [retryOpen, setRetryOpen] = useState(false);


  // The sticky actions bar owns the bottom edge on mobile; lift the shell's
  // ScrollToTop button above it.
  useEffect(() => {
    setScrollToTopBump("bottom-24");
    return () => setScrollToTopBump("");
  }, []);

  /**
   * Jump to a question from the navigator dialog — retry-until-mounted scroll
   * (the card may render a frame later), then close the dialog.
   */
  const jumpToQuestion = (index: number) => {
    const question = review?.questions[index];
    setNavOpen(false);
    if (!question) return;
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(
        `review-question-${question.question_id}`,
      );
      if (el) {
        const reduceMotion =
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
        return;
      }
      if (attempts++ < 10) window.requestAnimationFrame(tryScroll);
    };
    window.requestAnimationFrame(tryScroll);
  };

  if (isLoading) {
    return <QuizReviewSkeleton />;
  }

  if (isError || !review || !quiz) {
    return <QuizReviewNotFound slug={slug} quizId={quizId} />;
  }

  const attempt = review.attempt;
  const passingScore = Math.round(Number(quiz.passing_score_percent));
  const scorePercent =
    attempt.score_percent != null ? Number(attempt.score_percent) : 0;
  const passed = attempt.passed === true;
  // Retry is offered only while the quiz allows it (retakes on, and no
  // max-attempts cap exhausted by this attempt).
  const canRetry =
    quiz.allow_retakes &&
    (quiz.max_attempts == null || attempt.attempt_number < quiz.max_attempts);

  return (
    <div className="min-h-[70vh] pb-10">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-2">
        <div className="space-y-6 min-w-0">
          <ReviewScoreSummary
            attempt={attempt}
            quizTitle={quiz.title}
            slug={slug}
            quizId={quizId}
            passingScore={passingScore}
            scorePercent={scorePercent}
            passed={passed}
          />

          <ReviewActionsBar
            onOpenNavigation={() => setNavOpen(true)}
            canRetry={canRetry}
            onRetry={() => setRetryOpen(true)}
          />

          <ReviewOverallFeedback
            overallFeedbackText={
              (review as { overall_feedback_text?: string | null })
                .overall_feedback_text
            }
          />

          {/* Per-question breakdown */}
          <div className="space-y-4">
            {review.questions.map((q, idx) => (
              <ReviewQuestionCard
                key={q.question_id}
                question={q}
                index={idx}
              />
            ))}
          </div>
        </div>
      </div>

      <ReviewNavDialog
        open={navOpen}
        onOpenChange={setNavOpen}
        questions={review.questions}
        onJump={jumpToQuestion}
      />

      {/* Retry confirmation — starts a fresh attempt straight into the
          taking screen (the quiz route auto-starts on ?start=1). */}
      <PromptDialog
        open={retryOpen}
        onOpenChange={setRetryOpen}
        title={t("course_quiz_review.retry_confirm_title")}
        description={t("course_quiz_review.retry_confirm_body")}
        confirmLabel={t("course_quiz_review.retry_confirm_confirm")}
        cancelLabel={t("common.cancel", "Cancel")}
        onConfirm={() => {
          setRetryOpen(false);
          void navigate({
            to: "/courses/$slug/quiz/$quizId",
            params: { slug, quizId },
            search: { start: true },
          });
        }}
      />
    </div>
  );
}
