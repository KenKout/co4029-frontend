import { useTranslation } from "react-i18next";
import { Award, Lightbulb, Target } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { RichContent } from "@/components/ui/rich-content";
import type {
  QuizAttemptReviewOption,
  QuizAttemptReviewQuestion,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { optionVerdict, questionBadge } from "./helpers";

/** One answer option with its correct / chosen styling. */
function ReviewOptionRow({
  option,
  selected,
}: {
  option: QuizAttemptReviewOption;
  selected: boolean;
}) {
  const { t } = useTranslation();
  const isCorrect = option.is_correct;
  const { cls, labelKey, LabelIcon } = optionVerdict(isCorrect, selected);

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

/** Prompt + verdict badge header. */
function QuestionHeader({
  question,
  index,
}: {
  question: QuizAttemptReviewQuestion;
  index: number;
}) {
  const { t } = useTranslation();
  const badge = questionBadge(question, t);
  const BadgeIcon = badge.icon;

  return (
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

/** One question in the per-question breakdown. */
export function ReviewQuestionCard({
  question,
  index,
}: {
  question: QuizAttemptReviewQuestion;
  index: number;
}) {
  const { t } = useTranslation();

  return (
    <GlassCard
      id={`review-question-${question.question_id}`}
      className="p-6 space-y-5 scroll-mt-24"
    >
      <QuestionHeader question={question} index={index} />

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

      <QuestionMetaRow question={question} />
    </GlassCard>
  );
}
