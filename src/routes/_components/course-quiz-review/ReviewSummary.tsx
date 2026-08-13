import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Clock, HelpCircle, LayoutGrid, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
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
        <Link
          to="/courses/$slug/quiz/$quizId"
          params={{ slug, quizId }}
          search={{ start: false }}
        >
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
 * Compact result card: back + quiz name + attempt number on top, then a
 * 0-100% score bar whose SOLID fill colour expresses how close the result
 * is to passing — red when far, amber midway, green when close or passed
 * (always green once passed) — with the passing-score marker and the
 * attempt time, plus a compact passed/failed verdict.
 */
export function ReviewScoreSummary({
  attempt,
  quizTitle,
  slug,
  quizId,
  passingScore,
  scorePercent,
  passed,
}: {
  attempt: QuizAttemptReviewRead["attempt"];
  quizTitle: string;
  slug: string;
  quizId: string;
  passingScore: number;
  scorePercent: number;
  passed: boolean;
}) {
  const { t } = useTranslation();
  const clampedScore = Math.min(100, Math.max(0, scorePercent));
  const clampedPassing = Math.min(100, Math.max(1, passingScore || 100));

  // Single solid colour for the whole fill, decided by closeness to passing:
  // < 60% of the passing score → red, < 85% → amber, close or passed → green.
  const ratio = clampedScore / clampedPassing;
  const fillColor =
    passed || ratio >= 0.85
      ? "#059669"
      : ratio >= 0.6
        ? "#f59e0b"
        : "#dc2626";
  const fillStyle = {
    width: `${clampedScore}%`,
    background: fillColor,
  };

  return (
    <GlassCard className="p-5 sm:p-6">
      {/* Header: back · quiz name · attempt # */}
      <div className="flex items-center gap-2">
        <Link
          to="/courses/$slug/quiz/$quizId"
          params={{ slug, quizId }}
          search={{ start: false }}
        >
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
      </div>

      {/* Student score label anchored over their position on the bar.
          (No passing-score text — it collided with the score label when the
          two were close; the marker line on the bar still shows it.) */}
      <div className="relative h-6 mt-3">
        <span
          className="absolute -translate-x-1/2 text-sm font-headline font-black text-m3-on-surface tabular-nums"
          style={{ left: `${clampedScore}%` }}
        >
          {clampedScore.toFixed(0)}%
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
 * Question-breakdown + retry actions, wrapped in a box with the buttons
 * spread apart. The box is sticky at the bottom edge on mobile (like the
 * quiz taking footer) and a plain inline section on larger screens.
 */
export function ReviewActionsBar({
  onOpenNavigation,
  canRetry,
  onRetry,
}: {
  onOpenNavigation: () => void;
  canRetry: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  // Sticky bottom-0 only pins elements that sit BELOW the scrollable
  // content (the bar precedes the questions, so it scrolled away). It's a
  // fixed bottom bar on every viewport — always visible while the questions
  // scroll — with the page padding sized to the bar's height so nothing
  // hides behind it at full scroll.
  return (
    <div className="fixed bottom-0 inset-x-0 z-10 bg-white/95 backdrop-blur-md border-t border-border px-4 sm:px-6 lg:px-8 py-2.5">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-elev p-3 w-full">
        <Button
          variant="outline"
          onClick={onOpenNavigation}
          className="font-bold rounded-xl gap-2 border-m3-primary/40 text-m3-primary hover:bg-m3-primary-fixed/30"
        >
          <LayoutGrid className="h-4 w-4" />
          {t("course_quiz_review.question_breakdown")}
        </Button>
        {canRetry && (
          <Button
            onClick={onRetry}
            className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow hover:opacity-90 active:scale-95 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            {t("course_quiz_review.retry_quiz")}
          </Button>
        )}
      </div>
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
