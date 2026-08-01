import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientProgress } from "@/components/ui/gradient-progress";
import type { QuizAttemptReviewRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatTime, type ReviewStats } from "./helpers";

/** In-flight review fetch. */
export function QuizReviewSkeleton() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="space-y-3 w-full max-w-sm">
        <div className="h-4 rounded-full bg-m3-surface-container animate-pulse" />
        <div className="h-4 rounded-full bg-m3-surface-container animate-pulse w-4/5" />
        <div className="h-4 rounded-full bg-m3-surface-container animate-pulse w-3/5" />
      </div>
    </div>
  );
}

/** The attempt (or quiz) could not be loaded. */
export function QuizReviewNotFound({
  slug,
  quizId,
}: {
  slug: string;
  quizId: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <GlassCard className="p-10 text-center max-w-md">
        <HelpCircle className="h-10 w-10 text-m3-outline mx-auto mb-4" />
        <h2 className="font-headline font-bold text-xl text-m3-on-surface mb-2">
          {t("course_quiz_review.not_found_title")}
        </h2>
        <p className="text-sm text-m3-on-surface-variant mb-5">
          {t("course_quiz_review.not_found_body")}
        </p>
        <Link to="/courses/$slug/quiz/$quizId" params={{ slug, quizId }}>
          <Button className="rounded-xl gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("course_quiz_review.back_to_quiz")}
          </Button>
        </Link>
      </GlassCard>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string | number;
  tone?: "emerald" | "red" | "muted";
}) {
  return (
    <div className="bg-m3-surface-container-low rounded-xl p-3 flex items-start gap-2">
      <Icon
        className={cn(
          "h-4 w-4 mt-0.5 shrink-0",
          tone === "emerald" && "text-emerald-600",
          tone === "red" && "text-red-600",
          tone === "muted" && "text-m3-outline",
          !tone && "text-m3-secondary",
        )}
      />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest font-bold text-m3-on-surface-variant truncate">
          {label}
        </div>
        <div className="text-base font-headline font-bold text-m3-on-surface tabular-nums">
          {value}
        </div>
      </div>
    </div>
  );
}

/** Score dial, passing-score bar and the four tallies. */
export function ReviewScoreSummary({
  attempt,
  stats,
  passingScore,
  scorePercent,
  passed,
}: {
  attempt: QuizAttemptReviewRead["attempt"];
  stats: ReviewStats | null;
  passingScore: number;
  scorePercent: number;
  passed: boolean;
}) {
  const { t } = useTranslation();

  return (
    <GlassCard className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center shrink-0",
            passed
              ? "bg-emerald-50 text-emerald-600"
              : "bg-amber-50 text-amber-600",
          )}
        >
          <div className="text-center">
            <div className="text-2xl font-headline font-black">
              {scorePercent.toFixed(0)}%
            </div>
            <div className="text-[10px] uppercase tracking-wider font-bold">
              {passed
                ? t("course_quiz_review.passed")
                : t("course_quiz_review.failed")}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3 w-full">
          <div className="flex justify-between text-xs">
            <span className="text-m3-on-surface-variant">
              {t("course_quiz_review.passing_score")}
            </span>
            <span className="font-bold text-m3-on-surface">
              {passingScore}%
            </span>
          </div>
          <GradientProgress
            value={scorePercent}
            size="sm"
            variant={passed ? "primary" : "secondary"}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <Stat
              icon={CheckCircle2}
              label={t("course_quiz_review.stats.correct")}
              value={stats?.correct ?? 0}
              tone="emerald"
            />
            <Stat
              icon={XCircle}
              label={t("course_quiz_review.stats.incorrect")}
              value={stats?.incorrect ?? 0}
              tone="red"
            />
            <Stat
              icon={HelpCircle}
              label={t("course_quiz_review.stats.skipped")}
              value={stats?.skipped ?? 0}
              tone="muted"
            />
            <Stat
              icon={Clock}
              label={t("course_quiz_review.stats.time")}
              value={formatTime(attempt.time_taken_seconds)}
            />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/**
 * Phase 8: overall grade-band feedback (only present when the teacher
 * configured a matching band AND the review window shows the score).
 */
export function ReviewOverallFeedback({
  overallFeedbackText,
}: {
  overallFeedbackText: string | null | undefined;
}) {
  const { t } = useTranslation();
  if (!overallFeedbackText) return null;

  return (
    <GlassCard className="p-5 border-l-4 border-m3-primary">
      <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant mb-1">
        {t("course_quiz_review.overall_feedback")}
      </p>
      <p className="text-sm text-m3-on-surface whitespace-pre-wrap">
        {overallFeedbackText}
      </p>
    </GlassCard>
  );
}
