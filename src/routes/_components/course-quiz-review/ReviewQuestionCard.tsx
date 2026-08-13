import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Award, Check, Lightbulb, Target, X } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { RichContent } from "@/components/ui/rich-content";
import type {
  QuizAttemptReviewOption,
  QuizAttemptReviewQuestion,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * One answer option in the review. Only the meaningful options get visual
 * weight: the student's wrong pick (red, ✕) and the correct answer (green,
 * ✓); the rest render as plain neutral rows when revealed.
 */
function ReviewOptionRow({
  option,
  mark,
}: {
  option: QuizAttemptReviewOption;
  /** "wrong" = the student's incorrect pick, "correct" = the right answer. */
  mark: "correct" | "wrong" | null;
}) {
  let rowCls = "bg-m3-surface-container-low border-m3-outline-variant/20";
  let letterCls = "text-m3-on-surface-variant";
  const MarkIcon = mark === "wrong" ? X : mark === "correct" ? Check : null;

  if (mark === "wrong") {
    rowCls = "bg-red-500/10 border-red-400";
    letterCls = "bg-red-100 text-red-700";
  } else if (mark === "correct") {
    rowCls = "bg-emerald-500/10 border-emerald-400/70";
    letterCls = "bg-emerald-100 text-emerald-700";
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 flex items-center gap-2.5 text-sm",
        rowCls,
      )}
    >
      <span
        className={cn(
          "w-7 h-7 shrink-0 flex items-center justify-center rounded-full font-bold text-xs",
          letterCls,
        )}
      >
        {option.option_key}
      </span>
      {MarkIcon && (
        <MarkIcon
          className={cn(
            "h-4 w-4 shrink-0",
            mark === "wrong" ? "text-red-600" : "text-emerald-600",
          )}
        />
      )}
      <span className="flex-1 text-m3-on-surface leading-snug">
        {option.option_text}
      </span>
    </div>
  );
}

/** Prompt header — no verdict badge (the card outline carries it). */
function QuestionHeader({
  question,
  index,
}: {
  question: QuizAttemptReviewQuestion;
  index: number;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-xs font-headline font-black text-m3-secondary tabular-nums shrink-0">
          Q{index + 1}
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
    </div>
  );
}

/** Points, attention time and hint usage. */
function QuestionMetaRow({
  question,
}: {
  question: QuizAttemptReviewQuestion;
}) {
  const { t } = useTranslation();
  return (
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
  );
}

/**
 * One question in the per-question breakdown: green outline when answered
 * correctly, red otherwise. Options are collapsed — a correct question shows
 * only the correct answer; a wrong one shows the student's pick (red ✕) and
 * the correct answer (green ✓), with the remaining options behind a
 * "show all" toggle. Explanation + meta row stay at the bottom.
 */
export function ReviewQuestionCard({
  question,
  index,
}: {
  question: QuizAttemptReviewQuestion;
  index: number;
}) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const correctOption = question.options.find((o) => o.is_correct);
  const pickedOption = question.options.find(
    (o) => o.id === question.selected_option_id,
  );

  // Visible rows: correct question → just the right answer. Wrong question →
  // the pick + the right answer, everything else revealed on demand.
  let visible = question.is_correct
    ? correctOption
      ? [correctOption]
      : []
    : [pickedOption, correctOption].filter(
        (o): o is QuizAttemptReviewOption =>
          o !== undefined &&
          question.options.some((x) => x.id === o.id),
      );
  if (!question.is_correct && showAll) visible = question.options;

  const hiddenCount = Math.max(
    0,
    question.options.length - visible.length,
  );

  return (
    <GlassCard
      id={`review-question-${question.question_id}`}
      className={cn(
        "p-4 space-y-4 scroll-mt-24",
        question.is_correct
          ? "ring-2 ring-emerald-400/70"
          : "ring-2 ring-red-400/70",
      )}
    >
      <QuestionHeader question={question} index={index} />

      {visible.length > 0 && (
        <div className="space-y-2">
          {visible.map((opt) => (
            <ReviewOptionRow
              key={opt.id}
              option={opt}
              mark={
                opt.id === question.selected_option_id && !opt.is_correct
                  ? "wrong"
                  : opt.is_correct
                    ? "correct"
                    : null
              }
            />
          ))}
        </div>
      )}

      {!question.is_correct && hiddenCount > 0 && (
        <Button
          type="button"
          variant="link"
          onClick={() => setShowAll((v) => !v)}
          className="h-auto p-0 text-xs font-semibold text-m3-primary underline underline-offset-2"
        >
          {showAll
            ? t("course_quiz_review.hide_options")
            : t("course_quiz_review.show_all_options", {
                count: hiddenCount,
              })}
        </Button>
      )}

      {question.question_type !== "mcq" && question.answer_text && (
        <div className="rounded-xl bg-m3-surface-container-low p-4 border border-m3-outline-variant/20">
          <p className="text-[10px] uppercase tracking-widest font-bold text-m3-on-surface-variant mb-1">
            {t("course_quiz_review.your_answer")}
          </p>
          <p className="text-sm text-m3-on-surface whitespace-pre-wrap">
            {question.answer_text}
          </p>
        </div>
      )}

      {question.explanation && (
        <div className="rounded-xl bg-m3-primary-fixed/30 p-4 border border-m3-primary/15 flex gap-3">
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

      <QuestionMetaRow question={question} />
    </GlassCard>
  );
}
