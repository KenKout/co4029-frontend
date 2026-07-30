import { useMemo } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Award,
  Clock,
  Target,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { RichContent } from "@/components/ui/rich-content";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { useQuizAttemptReview, useStudentQuiz } from "@/lib/api/hooks/quizzes";
import { useCourseBySlug } from "@/lib/api/hooks/courses";
import type {
  QuizAttemptReviewOption,
  QuizAttemptReviewQuestion,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

function formatTime(totalSeconds: number | null | undefined) {
  if (totalSeconds == null) return "—";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

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
    const total = review.questions.length;
    const correct = review.questions.filter((q) => q.is_correct).length;
    const skipped = review.questions.filter(
      (q) => !q.selected_option_id && !q.answer_text,
    ).length;
    return { total, correct, incorrect: total - correct - skipped, skipped };
  }, [review]);

  if (isLoading) {
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

  if (isError || !review || !quiz) {
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

  const attempt = review.attempt;
  const passingScore = Math.round(Number(quiz.passing_score_percent));
  const scorePercent =
    attempt.score_percent != null ? Number(attempt.score_percent) : 0;
  const passed = attempt.passed === true;

  return (
    <div className="min-h-[70vh] pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
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

        {/* Phase 8: overall grade-band feedback (only present when the teacher
            configured a matching band AND the review window shows the score). */}
        {(() => {
          const fb = review as {
            overall_feedback_text?: string | null;
          };
          return fb.overall_feedback_text ? (
            <GlassCard className="p-5 border-l-4 border-m3-primary">
              <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant mb-1">
                {t("course_quiz_review.overall_feedback")}
              </p>
              <p className="text-sm text-m3-on-surface whitespace-pre-wrap">
                {fb.overall_feedback_text}
              </p>
            </GlassCard>
          ) : null;
        })()}

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

function ReviewQuestionCard({
  question,
  index,
}: {
  question: QuizAttemptReviewQuestion;
  index: number;
}) {
  const { t } = useTranslation();
  const wasSkipped =
    !question.selected_option_id && !question.answer_text?.trim();

  let badge: { icon: typeof CheckCircle2; label: string; cls: string };
  if (question.is_correct) {
    badge = {
      icon: CheckCircle2,
      label: t("course_quiz_review.correct"),
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  } else if (wasSkipped) {
    badge = {
      icon: HelpCircle,
      label: t("course_quiz_review.skipped"),
      cls: "bg-m3-surface-container text-m3-on-surface-variant border-m3-outline-variant/40",
    };
  } else {
    badge = {
      icon: XCircle,
      label: t("course_quiz_review.incorrect"),
      cls: "bg-red-50 text-red-700 border-red-200",
    };
  }
  const BadgeIcon = badge.icon;

  return (
    <GlassCard className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-xs font-headline font-black text-m3-secondary tabular-nums shrink-0">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="text-sm font-semibold text-m3-on-surface flex-1 min-w-0">
            <RichContent
              value={question.prompt_text}
              format={
                (question as { prompt_format?: string | null }).prompt_format ??
                "plain"
              }
              inline
            />
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0",
            badge.cls,
          )}
        >
          <BadgeIcon className="h-3 w-3" />
          {badge.label}
        </span>
      </div>

      {question.options.length > 0 && (
        <div className="space-y-2 mt-2">
          {question.options.map((opt) => (
            <ReviewOptionRow
              key={opt.id}
              option={opt}
              selected={question.selected_option_id === opt.id}
            />
          ))}
        </div>
      )}

      {question.question_type !== "mcq" && question.answer_text && (
        <div className="mt-3 rounded-xl bg-m3-surface-container-low p-4 border border-m3-outline-variant/20">
          <p className="text-[10px] uppercase tracking-widest font-bold text-m3-on-surface-variant mb-1">
            {t("course_quiz_review.your_answer")}
          </p>
          <p className="text-sm text-m3-on-surface whitespace-pre-wrap">
            {question.answer_text}
          </p>
        </div>
      )}

      {question.explanation && (
        <div className="mt-5 rounded-xl bg-m3-primary-fixed/30 p-4 border border-m3-primary/15 flex gap-3">
          <Lightbulb className="h-4 w-4 text-m3-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-bold text-m3-primary mb-1">
              {t("course_quiz_review.explanation")}
            </p>
            <div className="text-sm text-m3-on-surface">
              <RichContent
                value={question.explanation}
                format={
                  (question as { explanation_format?: string | null })
                    .explanation_format ?? "plain"
                }
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-[10px] text-m3-on-surface-variant pt-2 border-t border-m3-outline-variant/15">
        <span className="inline-flex items-center gap-1">
          <Award className="h-3 w-3" />
          {t("course_quiz_review.points", {
            n: Number(question.points_awarded ?? 0).toFixed(1),
          })}
        </span>
        {question.t_actual_ms != null && (
          <span className="inline-flex items-center gap-1">
            <Target className="h-3 w-3" />
            {(question.t_actual_ms / 1000).toFixed(1)}s
          </span>
        )}
        {question.hint_used && (
          <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
            <Lightbulb className="h-3 w-3" />
            {t("course_quiz_review.hint_used")}
          </span>
        )}
      </div>
    </GlassCard>
  );
}

function ReviewOptionRow({
  option,
  selected,
}: {
  option: QuizAttemptReviewOption;
  selected: boolean;
}) {
  const { t } = useTranslation();
  const isCorrect = option.is_correct;

  let cls = "bg-m3-surface-container-low border-m3-outline-variant/20";
  let labelKey: string | null = null;
  let LabelIcon: typeof CheckCircle2 | null = null;

  if (selected && isCorrect) {
    cls = "bg-emerald-50 border-emerald-300";
    labelKey = "course_quiz_review.option.your_correct";
    LabelIcon = CheckCircle2;
  } else if (selected && !isCorrect) {
    cls = "bg-red-50 border-red-300";
    labelKey = "course_quiz_review.option.your_incorrect";
    LabelIcon = XCircle;
  } else if (isCorrect) {
    cls = "bg-emerald-50/60 border-emerald-200 border-dashed";
    labelKey = "course_quiz_review.option.correct";
    LabelIcon = CheckCircle2;
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-3 flex items-center gap-3 text-sm",
        cls,
      )}
    >
      <span className="font-bold text-xs uppercase tracking-wider w-6 shrink-0 text-m3-on-surface-variant">
        {option.option_key}
      </span>
      <span className="flex-1 text-m3-on-surface">{option.option_text}</span>
      {LabelIcon && labelKey && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest shrink-0",
            isCorrect ? "text-emerald-700" : "text-red-700",
          )}
        >
          <LabelIcon className="h-3 w-3" />
          {t(labelKey)}
        </span>
      )}
    </div>
  );
}
