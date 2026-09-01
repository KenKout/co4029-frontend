import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { difficultyChipClass } from "./helpers";

/**
 * A row's metadata chips — type and difficulty.
 */
export function QuestionRowMeta({
  item,
}: {
  item: InterviewQuestionBankItemRead;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge
        variant="outline"
        className="border-m3-outline-variant/60 text-[10px] font-semibold"
      >
        {t(`teacher_interview_config.qbank.type.${item.question_type}`)}
      </Badge>
      {item.difficulty && (
        <span
          className={cn(
            // Same box as the type Badge (h-5 rounded-full
            // px-2) so the two read as peer attributes.
            "inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-semibold",
            difficultyChipClass(item.difficulty),
          )}
        >
          {t(`teacher_interview_config.qbank.difficulty.${item.difficulty}`)}
        </span>
      )}
    </div>
  );
}
