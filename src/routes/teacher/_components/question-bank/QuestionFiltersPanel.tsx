import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import type { InterviewOutcomeAuthoring } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { STATUS_ORDER } from "./constants";
import { FilterChip, FilterSelect } from "./filter-primitives";
import { statusMeta } from "./helpers";
import type {
  OutcomeFilterValue,
  OutcomeMeta,
  QuestionDifficulty,
  QuestionFilterValues,
  ReviewStatus,
  SourceFilterValue,
  StatusFilterValue,
} from "./types";

/**
 * Search + filters card of the Question Bank. Grouped into one bordered card,
 * matching the redesigned course Question Bank page so the two screens read as
 * the same product.
 *
 * Extracted verbatim from the former 2.4k-line question-bank.tsx.
 */
export interface QuestionFiltersPanelProps {
  filters: QuestionFilterValues;
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: StatusFilterValue) => void;
  onOutcomeFilterChange: (v: OutcomeFilterValue) => void;
  onDifficultyFilterChange: (v: string) => void;
  onTypeFilterChange: (v: string) => void;
  onSourceFilterChange: (v: SourceFilterValue) => void;
  outcomes: InterviewOutcomeAuthoring[];
  outcomeById: Map<string, OutcomeMeta>;
  presentDifficulties: QuestionDifficulty[];
  presentTypes: string[];
  statusCounts: Record<string, number>;
  totalCount: number;
  anyFilterActive: boolean;
  onClearFilters: () => void;
}

export function QuestionFiltersPanel(props: QuestionFiltersPanelProps) {
  const { t } = useTranslation();
  const { filters, outcomes, presentDifficulties, presentTypes } = props;
  return (
    <div className="space-y-2.5 rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest p-3">
      {/* Search bar on its own row */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant/60" />
        <Input
          type="search"
          value={filters.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          placeholder={t("teacher_interview_config.qbank.search_placeholder")}
          aria-label={t("teacher_interview_config.qbank.search_placeholder")}
          className="pl-9"
        />
      </div>
      {/* Filter selects below the search bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {outcomes.length > 0 && (
          <FilterSelect
            label={t("teacher_interview_config.qbank.filter.outcome")}
            value={filters.outcomeFilter}
            onChange={(v) => props.onOutcomeFilterChange(v)}
            options={[
              {
                value: "all",
                label: t("teacher_interview_config.qbank.filter.all_outcome"),
              },
              {
                value: "none",
                label: t("teacher_interview_config.qbank.filter.no_outcome"),
              },
              ...outcomes
                .slice()
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                .map((o, i) => ({
                  value: o.id,
                  label: `LO${i + 1}`,
                })),
            ]}
          />
        )}
        {presentDifficulties.length > 0 && (
          <FilterSelect
            label={t("teacher_interview_config.qbank.filter.difficulty")}
            value={filters.difficultyFilter}
            onChange={props.onDifficultyFilterChange}
            options={[
              {
                value: "all",
                label: t("teacher_interview_config.qbank.filter.all_difficulty"),
              },
              ...presentDifficulties.map((d) => ({
                value: d,
                label: t(`teacher_interview_config.difficulty.${d}`),
              })),
            ]}
          />
        )}
        {presentTypes.length > 0 && (
          <FilterSelect
            label={t("teacher_interview_config.qbank.filter.type")}
            value={filters.typeFilter}
            onChange={props.onTypeFilterChange}
            options={[
              {
                value: "all",
                label: t("teacher_interview_config.qbank.filter.all_type"),
              },
              ...presentTypes.map((qt) => ({
                value: qt,
                label: t(`teacher_interview_config.question_type.${qt}`),
              })),
            ]}
          />
        )}
        <FilterSelect
          label={t("teacher_interview_config.qbank.filter.source")}
          value={filters.sourceFilter}
          onChange={(v) => props.onSourceFilterChange(v as SourceFilterValue)}
          options={[
            {
              value: "all",
              label: t("teacher_interview_config.qbank.filter.all_source"),
            },
            {
              value: "ai",
              label: t("teacher_interview_config.qbank.source.ai"),
            },
            {
              value: "manual",
              label: t("teacher_interview_config.qbank.source.manual"),
            },
          ]}
        />
      </div>

      {/* Review status gets a segmented control rather than a sixth
          dropdown. It is the dimension a teacher curating a bank acts on
          most (pending vs approved), it has a small fixed value set, and
          its counts were already being computed — they were just buried
          inside `<option>` labels, where a dropdown hides them behind a
          click. Statuses with no questions are omitted so the control
          does not grow empty segments. Counts come from `statusCounts`,
          which is deliberately computed over the UNFILTERED pool so the
          numbers do not shrink as you narrow the list.

          This also replaces the amber "pending only" pill that used to
          sit above: it was never separate state, just a shortcut setting
          statusFilter to "pending", so a "Pending (n)" segment does the
          same job without a second control competing for the same idea. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedFilter
          ariaLabel={t("teacher_interview_config.qbank.filter.status")}
          value={filters.statusFilter}
          onChange={(v) =>
            props.onStatusFilterChange(v as ReviewStatus | "all")
          }
          options={[
            {
              key: "all" as const,
              label: t("teacher_interview_config.qbank.filter.all_status"),
              count: props.totalCount,
            },
            ...STATUS_ORDER.filter((s) => (props.statusCounts[s] ?? 0) > 0).map(
              (s) => ({
                key: s,
                label: t(
                  `teacher_interview_config.qbank.status.${statusMeta(s).key}`,
                ),
                count: props.statusCounts[s] ?? 0,
              }),
            ),
          ]}
        />
      </div>

      {/* Active filter chips */}
      {props.anyFilterActive && <ActiveFilterChips {...props} />}
    </div>
  );
}

function ActiveFilterChips({
  filters,
  outcomeById,
  onSearchChange,
  onStatusFilterChange,
  onOutcomeFilterChange,
  onDifficultyFilterChange,
  onTypeFilterChange,
  onSourceFilterChange,
  onClearFilters,
}: QuestionFiltersPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] font-semibold text-m3-on-surface-variant">
        {t("teacher_interview_config.qbank.active_filters")}
      </span>
      {filters.search.trim() && (
        <FilterChip
          label={`"${filters.search.trim()}"`}
          onClear={() => onSearchChange("")}
        />
      )}
      {filters.statusFilter !== "all" && (
        <FilterChip
          label={t(
            `teacher_interview_config.qbank.status.${statusMeta(filters.statusFilter).key}`,
          )}
          onClear={() => onStatusFilterChange("all")}
        />
      )}
      {filters.outcomeFilter !== "all" && (
        <FilterChip
          label={
            filters.outcomeFilter === "none"
              ? t("teacher_interview_config.qbank.filter.no_outcome")
              : (outcomeById.get(filters.outcomeFilter)?.label ?? "LO")
          }
          onClear={() => onOutcomeFilterChange("all")}
        />
      )}
      {filters.difficultyFilter !== "all" && (
        <FilterChip
          label={t(
            `teacher_interview_config.difficulty.${filters.difficultyFilter}`,
          )}
          onClear={() => onDifficultyFilterChange("all")}
        />
      )}
      {filters.typeFilter !== "all" && (
        <FilterChip
          label={t(
            `teacher_interview_config.question_type.${filters.typeFilter}`,
          )}
          onClear={() => onTypeFilterChange("all")}
        />
      )}
      {filters.sourceFilter !== "all" && (
        <FilterChip
          label={t(
            `teacher_interview_config.qbank.source.${filters.sourceFilter}`,
          )}
          onClear={() => onSourceFilterChange("all")}
        />
      )}
      <Button variant="link"
        type="button"
        onClick={onClearFilters}
        className="text-[11px] font-bold text-m3-primary hover:underline cursor-pointer"
      >
        {t("teacher_interview_config.qbank.clear_all")}
      </Button>
    </div>
  );
}
