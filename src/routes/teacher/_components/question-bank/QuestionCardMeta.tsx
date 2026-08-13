import { useTranslation } from "react-i18next";
import { Bot, FileText, Layers, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { difficultyChipClass } from "./helpers";
import { OutcomeControl } from "./OutcomeControl";
import type { QuestionCardProps } from "./types";

/**
 * Metadata row of a question card (real fields only): question type, practice
 * partition chip, module attribution chips, difficulty, the inline outcome
 * control, AI/manual source and the source-reference count.
 *
 * Extracted verbatim from the former 2.4k-line question-bank.tsx; the
 * `(!compact || expanded)` visibility condition stays with the caller.
 */
export function QuestionCardMeta({
  q,
  outcomeOptions,
  saving,
  onSetOutcome,
  moduleTitles,
}: Pick<
  QuestionCardProps,
  "q" | "outcomeOptions" | "saving" | "onSetOutcome" | "moduleTitles"
>) {
  const { t } = useTranslation();
  const sourceCount = Array.isArray(q.source_refs_json)
    ? q.source_refs_json.length
    : 0;
  return (
    <div className="flex items-center gap-x-2 gap-y-1 flex-wrap pl-5.5 text-[11px] text-m3-on-surface-variant/80">
      <span>
        {t(`teacher_interview_config.question_type.${q.question_type}`)}
      </span>
      {/* Module attribution: one chip per source module. A question
          sourced from 2+ modules therefore shows a separate chip for
          each, making cross-module questions visible at a glance. */}
      {moduleTitles.map((title, i) => (
        <span key={`${title}-${i}`} className="contents">
          <Sep />
          <span className="inline-flex items-center gap-1 rounded-full bg-m3-primary-fixed/60 px-1.5 py-0.5 font-medium text-m3-primary">
            <Layers className="h-3 w-3" aria-hidden="true" />
            {title}
          </span>
        </span>
      ))}
      {q.difficulty && (
        <>
          <Sep />
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 font-semibold",
              difficultyChipClass(q.difficulty),
            )}
          >
            {t(`teacher_interview_config.difficulty.${q.difficulty}`)}
          </span>
        </>
      )}
      <Sep />
      <OutcomeControl
        value={q.linked_outcome_id ?? null}
        options={outcomeOptions}
        saving={saving}
        onSetOutcome={onSetOutcome}
      />
      <Sep />
      <span className="inline-flex items-center gap-1">
        {q.ai_generated ? (
          <>
            <Bot className="h-3 w-3" aria-hidden="true" />
            {t("teacher_interview_config.qbank.source.ai")}
          </>
        ) : (
          <>
            <User className="h-3 w-3" aria-hidden="true" />
            {t("teacher_interview_config.qbank.source.manual")}
          </>
        )}
      </span>
      {sourceCount > 0 && (
        <>
          <Sep />
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" aria-hidden="true" />
            {t("teacher_interview_config.qbank.source_count", {
              count: sourceCount,
            })}
          </span>
        </>
      )}
    </div>
  );
}

function Sep() {
  return (
    <span aria-hidden="true" className="text-m3-on-surface-variant/40">
      ·
    </span>
  );
}
