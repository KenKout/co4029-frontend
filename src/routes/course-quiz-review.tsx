import { useMemo } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuizAttemptReview, useStudentQuiz } from "@/lib/api/hooks/quizzes";
import { useCourseBySlug } from "@/lib/api/hooks/courses";
import { computeReviewStats } from "@/routes/_components/course-quiz-review/helpers";
import { QuizReviewNavigator } from "@/routes/_components/course-quiz-review/QuizReviewNavigator";
import { ReviewQuestionCard } from "@/routes/_components/course-quiz-review/ReviewQuestionCard";
import {
  QuizReviewNotFound,
  QuizReviewSkeleton,
  ReviewOverallFeedback,
  ReviewScoreSummary,
} from "@/routes/_components/course-quiz-review/ReviewSummary";

/**
 * Post-submission attempt review. The score summary, grade-band feedback and
 * per-question breakdown live in `_components/course-quiz-review/`.
 *
 * Layout mirrors the taking screen (QuizTakingStage): fluid width inside the
 * app shell (no hard max-width), 12-col grid with the question navigator as
 * a sticky rail on wide screens, stacked on mobile.
 */
export default function CourseQuizReviewPage() {
  const { t } = useTranslation();
  const { slug, quizId, attemptId } = useParams({ strict: false }) as {
    slug: string;
    quizId: string;
    attemptId: string;
  };

  const { data: course } = useCourseBySlug(slug);
  const { data: quiz } = useStudentQuiz(quizId);
  const { data: review, isLoading, isError } = useQuizAttemptReview(attemptId);

  const stats = useMemo(() => {
    if (!review) return null;
    return computeReviewStats(review.questions);
  }, [review]);

  /**
   * Jump to a question from the navigator rail — same retry-until-mounted
   * scroll as the taking screen (the card may render a frame later).
   */
  const jumpToQuestion = (index: number) => {
    const question = review?.questions[index];
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

  return (
    <div className="min-h-[70vh] pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 xl:col-span-9 space-y-6 min-w-0">
            <div className="flex items-center gap-3 flex-wrap -ml-3">
              <Link to="/courses/$slug/quiz/$quizId" params={{ slug, quizId }}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-m3-on-surface-variant hover:text-m3-primary gap-1.5 text-xs font-bold px-3"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("course_quiz_review.back_to_quiz")}
                </Button>
              </Link>
              {course && (
                <span className="text-m3-on-surface-variant text-sm font-medium hidden sm:block">
                  {course.title}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="font-headline font-extrabold text-3xl sm:text-4xl text-m3-primary tracking-tight leading-none">
                {quiz.title}
              </h1>
              <p className="text-m3-on-surface-variant text-sm">
                {t("course_quiz_review.attempt_label", {
                  n: attempt.attempt_number,
                })}
              </p>
            </div>

            {/* Score summary */}
            <ReviewScoreSummary
              attempt={attempt}
              stats={stats}
              passingScore={passingScore}
              scorePercent={scorePercent}
              passed={passed}
            />

            <ReviewOverallFeedback
              overallFeedbackText={
                (review as { overall_feedback_text?: string | null })
                  .overall_feedback_text
              }
            />

            {/* Per-question breakdown */}
            <div className="space-y-4">
              <h2 className="font-headline font-bold text-lg text-m3-on-surface">
                {t("course_quiz_review.questions_title")}
              </h2>
              {review.questions.map((q, idx) => (
                <ReviewQuestionCard key={q.question_id} question={q} index={idx} />
              ))}
            </div>
          </div>

          {/* Question navigator rail — sticky on wide screens, stacks below
              on mobile (same pattern as the taking screen). */}
          <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-32 lg:self-start">
            <QuizReviewNavigator
              questions={review.questions}
              onJump={jumpToQuestion}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
