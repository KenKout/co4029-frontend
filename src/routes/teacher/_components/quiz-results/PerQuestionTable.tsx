import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  QuizQuestionBreakdown,
  QuizOptionDistribution,
} from "@/lib/api/types";

interface PerQuestionTableProps {
  questions: QuizQuestionBreakdown[];
}

/** Color a 0..1 correctness rate: red <50%, amber 50–79%, green ≥80%. */
function correctnessColor(rate: number | null): string {
  if (rate === null) return "text-m3-on-surface-variant";
  if (rate < 0.5) return "text-red-600";
  if (rate < 0.8) return "text-amber-600";
  return "text-emerald-600";
}

function fmtRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${Math.round(rate * 100)}%`;
}

/** Horizontal bar showing how many respondents chose one option. The correct
 *  option is tinted green and flagged so a tempting distractor stands out. */
function OptionBar({
  option,
  answeredCount,
}: {
  option: QuizOptionDistribution;
  answeredCount: number;
}) {
  const { t } = useTranslation();
  const pct =
    answeredCount > 0
      ? Math.round((option.chosen_count / answeredCount) * 100)
      : 0;

  return (
    <div className="flex items-center gap-3 py-1">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
          option.is_correct
            ? "bg-emerald-100 text-emerald-700"
            : "bg-m3-surface-container text-m3-on-surface-variant",
        )}
      >
        {option.option_key}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm",
              option.is_correct
                ? "font-medium text-m3-on-surface"
                : "text-m3-on-surface-variant",
            )}
          >
            {option.option_text}
          </span>
          {option.is_correct && (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          )}
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-m3-surface-container">
          <div
            className={cn(
              "h-full rounded-full",
              option.is_correct ? "bg-emerald-500" : "bg-m3-primary/60",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="w-16 shrink-0 text-right text-xs tabular-nums text-m3-on-surface-variant">
        {t("teacher_quiz_results.per_question.chosen_count", {
          count: option.chosen_count,
          pct,
        })}
      </span>
    </div>
  );
}

function QuestionRow({
  question,
  index,
}: {
  question: QuizQuestionBreakdown;
  index: number;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const hasOptions = question.option_distribution.length > 0;

  return (
    <div className="border-b border-m3-outline-variant last:border-b-0">
      <button
        type="button"
        onClick={() => hasOptions && setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
          hasOptions
            ? "cursor-pointer hover:bg-m3-surface-container-low"
            : "cursor-default",
        )}
        aria-expanded={hasOptions ? expanded : undefined}
      >
        <span className="w-6 shrink-0 text-sm tabular-nums text-m3-on-surface-variant">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-m3-on-surface">
          {question.prompt}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-m3-on-surface-variant">
          {t("teacher_quiz_results.per_question.answered", {
            count: question.answered_count,
          })}
        </span>
        <span
          className={cn(
            "w-16 shrink-0 text-right text-sm font-semibold tabular-nums",
            correctnessColor(question.correctness_rate),
          )}
        >
          {fmtRate(question.correctness_rate)}
        </span>
        <span className="w-5 shrink-0">
          {hasOptions ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-m3-on-surface-variant" />
            ) : (
              <ChevronRight className="h-4 w-4 text-m3-on-surface-variant" />
            )
          ) : null}
        </span>
      </button>
      {expanded && hasOptions && (
        <div className="space-y-1 bg-m3-surface-container-lowest px-3 py-2 pl-12">
          {question.option_distribution.map((option) => (
            <OptionBar
              key={option.option_id}
              option={option}
              answeredCount={question.answered_count}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Per-question difficulty breakdown, ordered hardest-first by the server.
 * Each MCQ row expands to show the chosen-option distribution so a teacher can
 * spot a tempting distractor. Correctness rate is color-coded (red/amber/green).
 */
export function PerQuestionTable({ questions }: PerQuestionTableProps) {
  const { t } = useTranslation();

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-m3-outline-variant/20 px-4 py-10 text-center text-sm text-m3-on-surface-variant">
        {t("teacher_quiz_results.per_question.empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-m3-outline-variant bg-card">
      <div className="flex items-center gap-3 border-b border-m3-outline-variant bg-m3-surface-container-low px-3 py-2 text-xs font-semibold uppercase tracking-wide text-m3-on-surface-variant">
        <span className="w-6 shrink-0">#</span>
        <span className="min-w-0 flex-1">
          {t("teacher_quiz_results.per_question.col_question")}
        </span>
        <span className="shrink-0">
          {t("teacher_quiz_results.per_question.col_answered")}
        </span>
        <span className="w-16 shrink-0 text-right">
          {t("teacher_quiz_results.per_question.col_correct")}
        </span>
        <span className="w-5 shrink-0" />
      </div>
      {questions.map((question, index) => (
        <QuestionRow
          key={question.question_id}
          question={question}
          index={index}
        />
      ))}
    </div>
  );
}
