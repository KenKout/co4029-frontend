import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { QuizAttemptRead, QuizPublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { QuizStudyModeCard } from "./QuizStudyModeCard";

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
              passed
                ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                : "bg-gradient-to-br from-m3-primary to-m3-secondary text-white",
            )}
          >
            {Math.round(score)}%
          </div>
          <h2 className="font-headline font-extrabold text-2xl text-m3-primary mb-1">
            {passed
              ? t("course_quiz.results.passed")
              : t("course_quiz.results.submitted")}
          </h2>
          <p className="text-m3-on-surface-variant text-sm mb-2">
            {passed
              ? t("course_quiz.results.passed_summary", {
                  title: quiz.title,
                  score: Math.round(score),
                })
              : t("course_quiz.results.failed_summary", {
                  score: Math.round(score),
                  passing: passingScore,
                })}
          </p>
          <p className="text-xs text-m3-outline mb-6">
            {t("course_quiz.labels.attempt_summary", {
              attempt: summary.attempt_number,
              correct: summary.correct_count ?? 0,
              total: summary.total_questions ?? totalQuestionsFallback,
            })}
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
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
