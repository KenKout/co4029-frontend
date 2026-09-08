import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { STATUS_FILTERS } from "./constants";
import type { CourseStudentsController } from "./use-course-students-controller";

/**
 * Roster search + status segmented control. Per-status counts are computed
 * here exactly as they were inline, so the badges keep their numbers.
 *
 * Sorting used to live here as a dropdown; it now lives on the DataTable's
 * column headers, so this bar is just search + status.
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
  } = controller;
  return (
    <Card className="gap-4 p-5 py-5 shadow-editorial">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-m3-on-surface-variant/60" />
        <Input
          placeholder={t("teacher_common.search_students")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

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
                : students.filter((s) => s.enrollment_status === f.key).length,
        }))}
      />
    </Card>
  );
}
