import { useTranslation } from "react-i18next";

import { formatRelativeInterviewTime } from "@/lib/interview/format";
import type { ConversationTurn } from "@/lib/interview/types";

/** Eyebrow row of the question card: position in the set, optional category
 * chip, and the turn's relative timestamp. */
export function QuestionCardHeader({
  turn,
  questionNumber,
  totalQuestions,
  category,
}: {
  turn: ConversationTurn;
  questionNumber: number;
  totalQuestions: number | null | undefined;
  category: string | null | undefined;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
        {totalQuestions
          ? t("course_interview.workspace.question_of", {
              current: questionNumber,
              total: totalQuestions,
            })
          : t("course_interview.workspace.question_number", {
              current: questionNumber,
            })}
      </span>
      {category && (
        <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-text-muted">
          {category}
        </span>
      )}
      {turn.elapsedSeconds !== undefined && (
        <time className="ml-auto text-xs font-medium tabular-nums text-text-subtle">
          {formatRelativeInterviewTime(turn.elapsedSeconds)}
        </time>
      )}
    </div>
  );
}
