import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { CourseEnrollmentStatusBadge } from "@/components/ui/status-badges";
import { useFormatDate } from "@/lib/format/date";
import type { RosterEntry } from "@/lib/api/types";
import { StudentIdentityCell } from "./StudentRow";
import type { ListQueryState } from "./types";

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

  const rows = useMemo(() => {
    const all = roster.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((e) =>
      [e.display_name, e.primary_email]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(q)),
    );
  }, [roster.data, query]);

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
      {canManageEnrollments && (
        <div className="flex justify-end">
          <Link
            to="/management/courses/$courseId/enrollments"
            params={{ courseId }}
          >
            <Button size="sm" className="gap-2">
              <Users className="h-4 w-4" />
              {t("dept_course_detail.manage_enrollments")}
            </Button>
          </Link>
        </div>
      )}

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
              <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onClear={query ? () => setQuery("") : undefined}
                  placeholder={t("dept_course_detail.search_students")}
                  wrapperClassName="w-full sm:w-72"
                  aria-label={t("dept_course_detail.search_students")}
                />
                <p className="text-xs text-text-muted">
                  {t("dept_course_detail.student_count", {
                    count: rows.length,
                  })}
                </p>
              </div>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
