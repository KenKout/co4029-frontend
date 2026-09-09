import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { CourseEnrollmentStatusBadge } from "@/components/ui/status-badges";
import { useFormatDate } from "@/lib/format/date";
import type { RosterEntry } from "@/lib/api/types";
import { StudentIdentityCell } from "./StudentRow";
import type { ListQueryState } from "./types";

type EnrollmentStatusFilter =
  | "all"
  | "active"
  | "completed"
  | "dropped"
  | "waitlisted";

const STATUS_FILTER_OPTIONS: { key: EnrollmentStatusFilter; i18nKey: string }[] =
  [
    { key: "all", i18nKey: "dept_course_detail.status_filter.all" },
    { key: "active", i18nKey: "dept_course_detail.status_filter.in_progress" },
    {
      key: "completed",
      i18nKey: "dept_course_detail.enrollment_status.completed",
    },
    {
      key: "dropped",
      i18nKey: "dept_course_detail.enrollment_status.dropped",
    },
    {
      key: "waitlisted",
      i18nKey: "dept_course_detail.enrollment_status.waitlisted",
    },
  ];

/**
 * Roster tab — read-only view of who is enrolled; all mutation lives on
 * `/management/courses/{id}/enrollments` (add / bulk import / invite codes),
 * which the "Manage enrollments" button links to.
 *
 * The link is gated on `course.enrollment.create` — the permission that page
 * itself requires — not on `course.assign_teacher`. An HOD has the latter but
 * not the former, so gating on staffing rights offered them a button that
 * bounced them straight back to the dashboard with an error toast.
 */
function EmptyStudents({
  canManageEnrollments,
  courseId,
}: {
  canManageEnrollments: boolean;
  courseId: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-10">
      <Users className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
      <p className="text-sm font-medium text-text-strong">
        {t("dept_course_detail.empty_students_title")}
      </p>
      {canManageEnrollments && (
        <Link
          to="/management/courses/$courseId/enrollments"
          params={{ courseId }}
          className="inline-flex items-center gap-1.5 mt-3 text-xs text-m3-primary hover:underline"
        >
          {t("dept_course_detail.manage_enrollments")}
        </Link>
      )}
    </div>
  );
}

/** Search + count + manage button (one line) over the status segmented filter. */
function RosterToolbar({
  query,
  onQueryChange,
  visibleCount,
  canManageEnrollments,
  courseId,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  visibleCount: number;
  canManageEnrollments: boolean;
  courseId: string;
  statusFilter: EnrollmentStatusFilter;
  onStatusFilterChange: (f: EnrollmentStatusFilter) => void;
  statusCounts: Record<EnrollmentStatusFilter, number>;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onClear={query ? () => onQueryChange("") : undefined}
          placeholder={t("dept_course_detail.search_students")}
          wrapperClassName="w-full sm:w-72"
          aria-label={t("dept_course_detail.search_students")}
        />
        <p className="text-xs text-text-muted">
          {t("dept_course_detail.student_count", { count: visibleCount })}
        </p>
        {/* Same line as the search input (was its own row above the table);
            pushed right so search/selection stays left. The empty roster case
            keeps its inline link in EmptyStudents. */}
        {canManageEnrollments && (
          <Link
            to="/management/courses/$courseId/enrollments"
            params={{ courseId }}
            className="ml-auto"
          >
            <Button size="sm" className="gap-2">
              <Users className="h-4 w-4" />
              {t("dept_course_detail.manage_enrollments")}
            </Button>
          </Link>
        )}
      </div>
      {/* Status filter — same vocabulary as the teacher course-students page;
          "In progress" = enrollment active. */}
      <SegmentedFilter
        ariaLabel={t("dept_course_detail.status_filter.aria")}
        value={statusFilter}
        onChange={onStatusFilterChange}
        options={STATUS_FILTER_OPTIONS.map((f) => ({
          key: f.key,
          label: t(f.i18nKey),
          count: statusCounts[f.key],
        }))}
      />
    </div>
  );
}

export function DeptStudentsTab({
  active,
  roster,
  canManageEnrollments,
  courseId,
}: {
  active: boolean;
  roster: ListQueryState<RosterEntry>;
  canManageEnrollments: boolean;
  courseId: string;
}) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const [query, setQuery] = useState("");
  // Completed/dropped students ARE in the roster payload (the endpoint does
  // not filter by status) — they were only indistinguishable. This filter is
  // the same vocabulary as the teacher course-students page.
  const [statusFilter, setStatusFilter] = useState<EnrollmentStatusFilter>("all");

  const statusCounts = useMemo(() => {
    const all = roster.data ?? [];
    return {
      all: all.length,
      active: all.filter((e) => e.status === "active").length,
      completed: all.filter((e) => e.status === "completed").length,
      dropped: all.filter((e) => e.status === "dropped").length,
      waitlisted: all.filter((e) => e.status === "waitlisted").length,
    };
  }, [roster.data]);

  const rows = useMemo(() => {
    const all = roster.data ?? [];
    const byStatus =
      statusFilter === "all"
        ? all
        : all.filter((e) => e.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((e) =>
      [e.display_name, e.primary_email]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(q)),
    );
  }, [roster.data, query, statusFilter]);

  const columns: DataTableColumn<RosterEntry>[] = useMemo(
    () => [
      {
        id: "student",
        header: t("dept_course_detail.col_student"),
        sortable: true,
        sortValue: (e) => (e.display_name || e.primary_email).toLowerCase(),
        cell: (e) => <StudentIdentityCell entry={e} />,
      },
      {
        id: "status",
        header: t("dept_course_detail.col_status"),
        sortable: true,
        sortValue: (e) => e.status,
        cell: (e) => <CourseEnrollmentStatusBadge status={e.status} />,
      },
      {
        // The terminal dates the payload already carries: when the student
        // completed the course (and, for drops, when they left). Em dash when
        // not applicable — no date is information, not missing data.
        id: "completed_at",
        header: t("dept_course_detail.col_completed"),
        sortable: true,
        sortValue: (e) => e.completed_at ?? "",
        align: "right",
        cell: (e) => (
          <span className="text-xs text-text-muted whitespace-nowrap">
            {e.completed_at
              ? formatDate(e.completed_at)
              : e.dropped_at
                ? t("dept_course_detail.dropped_on", {
                    date: formatDate(e.dropped_at),
                  })
                : "—"}
          </span>
        ),
      },
      {
        id: "enrolled_at",
        header: t("dept_course_detail.col_enrolled"),
        sortable: true,
        align: "right",
        sortValue: (e) => e.enrolled_at,
        cell: (e) => (
          <span className="text-xs text-text-muted whitespace-nowrap">
            {formatDate(e.enrolled_at)}
          </span>
        ),
      },
    ],
    [t, formatDate],
  );

  if (!active) return null;

  return (
    <div className="space-y-4">
      {roster.isLoading ? (
        <PageSkeleton
          rows={4}
          rounded="rounded-lg"
          bg="bg-surface-muted"
          gap="space-y-2"
        />
      ) : roster.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("dept_course_detail.load_failed_students")}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(e) => e.enrollment_id}
          pagination
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            query ? (
              t("dept_course_detail.empty_search_students")
            ) : (
              <EmptyStudents
                canManageEnrollments={canManageEnrollments}
                courseId={courseId}
              />
            )
          }
          toolbar={
            (roster.data ?? []).length > 0 ? (
              <RosterToolbar
                query={query}
                onQueryChange={setQuery}
                visibleCount={rows.length}
                canManageEnrollments={canManageEnrollments}
                courseId={courseId}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusCounts={statusCounts}
              />
            ) : undefined
          }
        />
      )}
    </div>
  );
}
