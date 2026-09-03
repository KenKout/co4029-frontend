import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { QuizAttemptRead, QuizPublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { reviewAllowed } from "@/lib/quiz/review-visibility";
import { QuizStudyModeCard } from "./QuizStudyModeCard";

function resultTitle(
  t: TFunction,
  gradingPending: boolean,
  scoreAvailable: boolean,
  passed: boolean,
) {
  if (gradingPending) return t("course_quiz.results.awaiting_grade");
  if (!scoreAvailable) return t("course_quiz.results.score_hidden");
  return passed
    ? t("course_quiz.results.passed")
    : t("course_quiz.results.submitted");
}

function resultSummary(
  t: TFunction,
  quiz: QuizPublic,
  gradingPending: boolean,
  scoreAvailable: boolean,
  passed: boolean,
  score: number,
  passingScore: number,
) {
  if (gradingPending) return t("course_quiz.results.awaiting_grade_summary");
  if (!scoreAvailable) return t("course_quiz.results.score_hidden_summary");
  if (passed) {
    return t("course_quiz.results.passed_summary", {
      title: quiz.title,
      score: Math.round(score),
    });
  }
  return t("course_quiz.results.failed_summary", {
    score: Math.round(score),
    passing: passingScore,
  });
}

/**
 * Post-submission results view: score ring, pass/fail summary, attempt recap,
 * and the config recap card. Shown once an attempt has been submitted/graded.
 */
export function QuizResultScreen({
  quiz,
  summary,
  totalQuestionsFallback,
  slug,
}: {
  quiz: QuizPublic;
  summary: QuizAttemptRead;
  totalQuestionsFallback: number;
  slug: string;
}) {
  const { t } = useTranslation();
  const gradingPending = summary.grading_pending === true;
  const scoreAvailable =
    summary.score_percent != null && summary.passed != null && !gradingPending;
  const score = Number(summary.score_percent ?? 0);
  const passed = Boolean(summary.passed);
  const passingScore = Math.round(Number(quiz.passing_score_percent));

  return (
    <div className="min-h-[70vh] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        <GlassCard className="p-8 sm:p-10 text-center">
          <div
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black font-headline shadow-lg",
              scoreAvailable && passed
                ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                : scoreAvailable
                  ? "bg-gradient-to-br from-m3-primary to-m3-secondary text-white"
                  : "bg-m3-surface-container-high text-m3-on-surface-variant",
            )}
          >
            {scoreAvailable ? `${Math.round(score)}%` : "…"}
          </div>
          <h2 className="font-headline font-extrabold text-2xl text-m3-primary mb-1">
            {resultTitle(t, gradingPending, scoreAvailable, passed)}
          </h2>
          <p className="text-m3-on-surface-variant text-sm mb-2">
            {resultSummary(
              t,
              quiz,
              gradingPending,
              scoreAvailable,
              passed,
              score,
              passingScore,
            )}
          </p>
          {scoreAvailable && (
            <p className="text-xs text-m3-outline mb-6">
              {t("course_quiz.labels.attempt_summary", {
                attempt: summary.attempt_number,
                correct: summary.correct_count ?? 0,
                total: summary.total_questions ?? totalQuestionsFallback,
              })}
            </p>
          )}

          <div className="flex gap-3 justify-center flex-wrap">
            {reviewAllowed(quiz, summary.submitted_at) && (
              <Link
                to="/courses/$slug/quiz/$quizId/attempts/$attemptId"
                params={{ slug, quizId: quiz.id, attemptId: summary.id }}
              >
                <Button className="rounded-xl font-bold text-sm gap-2">
                  <ListChecks className="h-4 w-4" />
                  {t("course_quiz.actions.review_answers")}
                </Button>
              </Link>
            )}
            <Link to="/courses/$slug/learn" params={{ slug }}>
              <Button
                variant="outline"
                className="rounded-xl ghost-border font-bold text-sm gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("course_quiz.actions.back_to_course")}
              </Button>
            </Link>
          </div>
        </GlassCard>

        <QuizStudyModeCard
          allowRetakes={quiz.allow_retakes}
          maxAttempts={quiz.max_attempts}
          showHints={quiz.show_hints}
          cooldownHours={quiz.cooldown_hours}
        />
      </div>
    </div>
  );
}
