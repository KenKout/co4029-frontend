import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { QuizQuestionAuthoring } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * The header strip of a QuestionCard: the bulk-select checkbox, the
 * position / type / review-status / expected-time badges, an unsaved marker
 * and the per-question action menu.
 *
 * The actions moved up here from a footer row. With saving now handled once
 * for the whole quiz, what remains per question is occasional and belongs
 * beside the question's identity rather than in a row of competing buttons
 * under it.
 */
export function QuestionCardMetaRow({
  question,
  selected,
  onToggleSelect,
  expectedSeconds,
  dirty = false,
  actions,
}: {
  question: QuizQuestionAuthoring;
  selected: boolean;
  onToggleSelect: () => void;
  expectedSeconds: number | null;
  /** Draft differs from the stored row — mirrors the quiz-level save bar. */
  dirty?: boolean;
  /** Per-question action menu; omitted on a published (frozen) quiz. */
  actions?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4"
        />
        <span className="sr-only">
          {t("teacher_quiz_manage.questions.sr_select", {
            position: question.position,
          })}
        </span>
      </label>
      <Badge className="border-0 bg-m3-primary-fixed text-m3-primary text-[10px]">
        {t("teacher_quiz_manage.questions.position_label", {
          position: question.position,
        })}
      </Badge>
      <Badge className="border-0 bg-blue-50 text-blue-800 text-[10px] capitalize">
        {question.question_type.replace("_", " ")}
      </Badge>
      <Badge
        className={cn(
          "border-0 text-[10px] capitalize",
          question.review_status === "approved"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-50 text-amber-700",
        )}
      >
        {question.review_status}
      </Badge>
      {expectedSeconds !== null ? (
        <Badge className="border-0 bg-m3-surface-container-high text-m3-on-surface text-[10px] gap-1">
          <Clock className="h-3 w-3" />
          {expectedSeconds}s
        </Badge>
      ) : (
        <Badge className="border-0 bg-amber-50 text-amber-700 text-[10px] gap-1">
          <Clock className="h-3 w-3" />
          {t("teacher_quiz_manage.questions.no_time_set")}
        </Badge>
      )}

      {/* Which cards the save bar is talking about. Without a per-card marker
          the bar can say "3 questions have unsaved changes" while nothing on
          screen says which three. */}
      {dirty && (
        <Badge className="border-0 bg-amber-100 text-amber-800 text-[10px] gap-1">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-amber-500"
          />
          {t("teacher_quiz_manage.questions.unsaved", "Unsaved")}
        </Badge>
      )}

      {actions && <div className="ml-auto">{actions}</div>}
    </div>
  );
}
