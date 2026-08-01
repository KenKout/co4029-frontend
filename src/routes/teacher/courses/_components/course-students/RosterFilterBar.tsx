import { useTranslation } from "react-i18next";
import { Filter, Search } from "lucide-react";

import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { Select } from "@/components/ui/select";

import { SORT_OPTIONS, STATUS_FILTERS } from "./constants";
import type { SortKey } from "./types";
import type { CourseStudentsController } from "./use-course-students-controller";

/**
 * Roster search + status segmented control + sort dropdown, extracted verbatim
 * from the former 658-line course-students.tsx. Per-status counts are computed
 * here exactly as they were inline, so the badges keep their numbers.
 */
export function RosterFilterBar({
  controller,
}: {
  controller: CourseStudentsController;
}) {
  const { t } = useTranslation();
  const {
    students,
    atRiskCount,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortKey,
    setSortKey,
  } = controller;
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl p-5 ghost-border shadow-editorial space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant/60" />
        <input
          type="text"
          placeholder={t("teacher_common.search_students")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-m3-surface-container-low border border-m3-outline-variant/20 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-m3-primary/20 transition-all"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status segmented control — shared component, per-status counts. */}
        <SegmentedFilter
          ariaLabel="Student status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_FILTERS.map((f) => ({
            key: f.key,
            label: f.label,
            count:
              f.key === "all"
                ? students.length
                : f.key === "at_risk"
                  ? atRiskCount
                  : students.filter((s) => s.enrollment_status === f.key)
                      .length,
          }))}
        />

        <div className="flex items-center gap-2 text-xs text-m3-on-surface-variant">
          <Filter className="h-3.5 w-3.5" />
          <span>Sort:</span>
          <Select<SortKey>
            value={sortKey}
            onValueChange={(next) => setSortKey(next)}
            size="sm"
            className="w-44"
            options={SORT_OPTIONS}
          />
        </div>
      </div>
    </div>
  );
}
