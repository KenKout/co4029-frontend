import { useTranslation } from "react-i18next";
import { Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { difficultyChipClass } from "./helpers";
import type { QuestionBankFiltersController } from "./use-question-bank-filters";

/**
 * A row's metadata chips — type, difficulty, and the clickable tags that apply
 * the tag filter. Extracted verbatim from the former 843-line
 * course-question-bank.tsx.
 */
export function QuestionRowMeta({
  item,
  filters,
}: {
  item: InterviewQuestionBankItemRead;
  filters: QuestionBankFiltersController;
}) {
  const { t } = useTranslation();
  const { tagFilter, setTagFilter } = filters;
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
      {(item.tags ?? []).map((tag) => (
        <Button variant="ghost"
          key={tag}
          type="button"
          onClick={() => setTagFilter(tag)}
          title={t("teacher_question_bank.filter_by_tag", {
            tag,
          })}
          className={cn(
            "inline-flex h-5 cursor-pointer items-center gap-1 rounded-full border px-2 text-[10px] leading-none",
            "transition-all duration-150 active:scale-95",
            tagFilter === tag
              ? "border-m3-primary/40 bg-m3-primary-fixed text-m3-primary"
              : "border-m3-outline-variant/40 bg-m3-surface text-m3-on-surface-variant hover:border-m3-primary/40 hover:text-m3-primary",
          )}
        >
          <Tag className="h-2.5 w-2.5" />
          {tag}
        </Button>
      ))}
    </div>
  );
}
