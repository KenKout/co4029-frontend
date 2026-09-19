import {
  DataTableToolbar,
  type FilterDef,
} from "@/components/ui/data-table-toolbar";
import { CheckboxField } from "@/components/ui/checkbox";

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
  const {
    t,
    table,
    statusFilter,
    setStatusFilter,
    includeDeleted,
    setIncludeDeleted,
  } = c;

  const statusFilterDef: FilterDef = {
    id: STATUS_FILTER_ID,
    label: t("admin.courses_list.filter_status", { defaultValue: "Status" }),
    allLabel: t("admin.courses_list.filter_status_all", {
      defaultValue: "All statuses",
    }),
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
        <CheckboxField
          checked={includeDeleted}
          onCheckedChange={setIncludeDeleted}
          className="shrink-0"
          labelClassName="text-text-strong"
          label={t("admin.courses_list.include_deleted")}
        />
      }
    />
  );
}
