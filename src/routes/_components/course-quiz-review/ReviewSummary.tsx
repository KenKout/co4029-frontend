import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Clock, HelpCircle, LayoutGrid, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { QuizAttemptReviewRead } from "@/lib/api/types";
import { formatTime } from "./helpers";

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

/**
 * Compact result card: back + quiz name + attempt number + avatar on top,
 * then a 0-100% score bar whose fill runs red → green (green at the passing
 * score) with the passing-score marker and the attempt time, and a compact
 * passed/failed verdict. The per-answer tallies moved out — the breakdown
 * button in {@link ReviewActionsBar} shows them via the question dialog.
 */
export function ReviewScoreSummary({
  attempt,
  quizTitle,
  slug,
  quizId,
  passingScore,
  scorePercent,
  passed,
  avatarUrl,
  avatarFallback,
}: {
  attempt: QuizAttemptReviewRead["attempt"];
  quizTitle: string;
  slug: string;
  quizId: string;
  passingScore: number;
  scorePercent: number;
  passed: boolean;
  avatarUrl?: string | null;
  avatarFallback: string;
}) {
  const { t } = useTranslation();
  const clampedScore = Math.min(100, Math.max(0, scorePercent));
  const clampedPassing = Math.min(100, Math.max(1, passingScore || 100));

  // Fill gradient mapped to the BAR (0-100): red at 0, amber halfway to
  // passing, green AT the passing score — so a score far below passing shows
  // red, and near/above passing shows green. Clipped to the student's score.
  const fillStyle = {
    width: `${clampedScore}%`,
    background: `linear-gradient(90deg, #dc2626 0%, #f59e0b ${clampedPassing / 2}%, #059669 ${clampedPassing}%)`,
  };

  return (
    <GlassCard className="p-5 sm:p-6">
      {/* Header: back · quiz name · attempt # · avatar */}
      <div className="flex items-center gap-2">
        <Link to="/courses/$slug/quiz/$quizId" params={{ slug, quizId }}>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-xl text-m3-on-surface-variant hover:text-m3-primary shrink-0"
            aria-label={t("course_quiz_review.back_to_quiz")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="flex-1 min-w-0 truncate font-headline font-bold text-sm sm:text-base text-m3-on-surface">
          {quizTitle}
        </span>
        <span className="text-xs font-bold text-m3-on-surface-variant shrink-0">
          {t("course_quiz_review.attempt_label", {
            n: attempt.attempt_number,
          })}
        </span>
        <Avatar className="h-8 w-8 shrink-0 ring-2 ring-surface-elev shadow-sm">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="bg-primary text-white text-[10px] font-bold">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Score vs passing labels, anchored over the bar markers */}
      <div className="relative h-6 mt-3">
        <span
          className="absolute -translate-x-1/2 text-sm font-headline font-black text-m3-on-surface tabular-nums"
          style={{ left: `${clampedScore}%` }}
        >
          {clampedScore.toFixed(0)}%
        </span>
        <span
          className="absolute -translate-x-1/2 text-[10px] font-bold text-m3-on-surface-variant tabular-nums"
          style={{ left: `${clampedPassing}%` }}
        >
          {t("course_quiz_review.passing_score")} {passingScore}%
        </span>
      </div>

      {/* Score bar: red → green, passing marker, time at the right end */}
      <div className="relative h-3 rounded-full bg-m3-surface-container overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={fillStyle}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-m3-on-surface-variant"
          style={{ left: `${clampedPassing}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1 text-[10px] text-m3-on-surface-variant">
        <span className="inline-flex items-center gap-1 font-bold">
          {passed ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span className="text-emerald-600">
                {t("course_quiz_review.passed")}
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3 text-red-600" />
              <span className="text-red-600">
                {t("course_quiz_review.failed")}
              </span>
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {t("course_quiz_review.stats.time")}:{" "}
          {formatTime(attempt.time_taken_seconds)}
        </span>
      </div>
    </GlassCard>
  );
}

/**
 * Question-breakdown + retry actions. Sticky at the bottom edge on mobile
 * (like the quiz taking footer), a plain inline row on larger screens.
 */
export function ReviewActionsBar({
  onOpenNavigation,
  canRetry,
  retryTo,
}: {
  onOpenNavigation: () => void;
  canRetry: boolean;
  retryTo: { slug: string; quizId: string };
}) {
  const { t } = useTranslation();
  return (
    <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 lg:mx-0 lg:px-0 px-4 sm:px-6 py-2.5 bg-white/95 backdrop-blur-md border-t border-border flex items-center gap-2 lg:static lg:bg-transparent lg:border-0 lg:px-0 lg:py-0">
      <Button
        variant="outline"
        onClick={onOpenNavigation}
        className="font-bold rounded-xl gap-2 flex-1 lg:flex-none border-m3-primary/40 text-m3-primary hover:bg-m3-primary-fixed/30"
      >
        <LayoutGrid className="h-4 w-4" />
        {t("course_quiz_review.question_breakdown")}
      </Button>
      {canRetry && (
        <Link
          to="/courses/$slug/quiz/$quizId"
          params={{ slug: retryTo.slug, quizId: retryTo.quizId }}
          className="flex-1 lg:flex-none"
        >
          <Button className="w-full gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow px-6 h-auto hover:opacity-90 active:scale-95 transition-all">
            <RotateCcw className="h-4 w-4" />
            {t("course_quiz_review.retry_quiz")}
          </Button>
        </Link>
      )}
    </div>
  );
}

/** Overall grade-band feedback (teacher-configured, review window only). */
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
