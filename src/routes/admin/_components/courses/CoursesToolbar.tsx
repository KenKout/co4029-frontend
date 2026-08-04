import { DataTableToolbar, type FilterDef } from "@/components/ui/data-table-toolbar";

import type { AdminCoursesController } from "./use-admin-courses";

const STATUS_FILTER_ID = "status";

/** The three lifecycle states a course can be in (same closed set as the
 *  `AdminCourseStatusBadge` token map). */
const COURSE_STATUSES = ["draft", "published", "archived"] as const;

/**
 * Search box + status filter + include-deleted toggle, built on the shared
 * DataTableToolbar so this page's toolbar matches the other admin tables
 * (processing jobs) instead of hand-rolled controls. The status filter is a
 * server-side `status` query param; the include-deleted checkbox rides along
 * as trailing content.
 */
export function CoursesToolbar({ c }: { c: AdminCoursesController }) {
  const { t, table, statusFilter, setStatusFilter, includeDeleted, setIncludeDeleted } = c;

  const statusFilterDef: FilterDef = {
    id: STATUS_FILTER_ID,
    label: t("admin.courses_list.filter_status", { defaultValue: "Status" }),
    options: COURSE_STATUSES.map((s) => ({
      value: s,
      label: t(`admin.courses_list.row_status.${s}`),
    })),
  };

  return (
    <DataTableToolbar
      search={table.search}
      onSearchChange={table.setSearch}
      searchPlaceholder={t("admin.courses_list.search_placeholder", {
        defaultValue: "Search by title or slug…",
      })}
      filters={[statusFilterDef]}
      filterValues={{ status: statusFilter }}
      onFilterChange={(_filterId, value) => setStatusFilter(value)}
      onResetAllFilters={() => setStatusFilter(undefined)}
      clearLabel={t("admin.courses_list.clear_filters", {
        defaultValue: "Clear filters",
      })}
      trailing={
        <label className="inline-flex items-center gap-2 text-sm text-text-strong select-none shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-m3-primary"
          />
          {t("admin.courses_list.include_deleted")}
        </label>
      }
    />
  );
}
