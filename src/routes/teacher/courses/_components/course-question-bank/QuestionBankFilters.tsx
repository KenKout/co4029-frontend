import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  InterviewDifficulty,
  InterviewQuestionType,
} from "@/lib/api/types";
import { DIFFICULTIES, QUESTION_TYPES } from "./constants";
import { FilterSelect } from "./filter-primitives";
import type { QuestionBankDerived } from "./use-question-bank-derived";
import type { QuestionBankFiltersController } from "./use-question-bank-filters";

/**
 * The bank's filter panel — free-text search, difficulty, tag, and the type
 * segmented control — extracted verbatim from the former 843-line
 * course-question-bank.tsx.
 */
export function QuestionBankFilters({
  filters,
  derived,
}: {
  filters: QuestionBankFiltersController;
  derived: QuestionBankDerived;
}) {
  const { t } = useTranslation();
  const {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    difficultyFilter,
    setDifficultyFilter,
    tagFilter,
    setTagFilter,
    anyFilterActive,
    clearFilters,
  } = filters;
  const { allTags, filtered, typeCounts, total } = derived;
  return (
    <div className="space-y-2.5 rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant/60" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("teacher_question_bank.search_placeholder")}
            aria-label={t("teacher_question_bank.search_placeholder")}
            className="pl-9"
          />
        </div>
        <FilterSelect
          label={t("teacher_question_bank.filter_difficulty")}
          value={difficultyFilter}
          onChange={(v) =>
            setDifficultyFilter(v as InterviewDifficulty | "all")
          }
          options={[
            { value: "all", label: t("teacher_question_bank.all") },
            ...DIFFICULTIES.map((d) => ({
              value: d,
              label: t(`teacher_interview_config.qbank.difficulty.${d}`),
            })),
          ]}
        />
        {allTags.length > 0 && (
          <FilterSelect
            label={t("teacher_question_bank.filter_tag")}
            value={tagFilter}
            onChange={setTagFilter}
            options={[
              { value: "all", label: t("teacher_question_bank.all") },
              ...allTags.map((tag) => ({ value: tag, label: tag })),
            ]}
          />
        )}
      </div>

      {/* Type moves from a dropdown to a segmented control: 5 fixed values
          with counts, which a <select> hides behind a click. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedFilter
          ariaLabel={t("teacher_question_bank.filter_type")}
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as InterviewQuestionType | "all")}
          options={[
            {
              key: "all" as const,
              label: t("teacher_question_bank.all"),
              count: total,
            },
            ...QUESTION_TYPES.filter((qt) => (typeCounts.get(qt) ?? 0) > 0).map(
              (qt) => ({
                key: qt,
                label: t(`teacher_interview_config.qbank.type.${qt}`),
                count: typeCounts.get(qt) ?? 0,
              }),
            ),
          ]}
        />
        {anyFilterActive && (
          <Button variant="ghost"
            type="button"
            onClick={clearFilters}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold",
              "text-m3-on-surface-variant transition-all duration-200",
              "hover:bg-m3-surface-container hover:text-m3-primary active:scale-[0.97]",
              "animate-[fade-in-up_0.2s_ease-out_both]",
            )}
          >
            <X className="h-3 w-3" />
            {t("teacher_question_bank.clear_filters")}
          </Button>
        )}
      </div>

      {anyFilterActive && (
        <p className="text-[11px] text-m3-on-surface-variant tabular-nums">
          {t("teacher_question_bank.showing_filtered", {
            shown: filtered.length,
            total,
          })}
        </p>
      )}
    </div>
  );
}
