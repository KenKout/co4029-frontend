import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, Users } from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { useCourseReadiness } from "@/lib/api/hooks/dept";
import type { TeacherAssignmentRead } from "@/lib/api/types";
import { AssignTeacherForm } from "./AssignTeacherForm";
import { TeacherIdentityCell, TeacherRowActions } from "./TeacherRow";
import type { ListQueryState } from "./types";

/**
 * Teachers tab — a DataTable, matching the `/dept` worklist this page is
 * reached from. It was a hand-rolled row list, which is the exact pattern the
 * worklist migrated away from; keeping it meant the same entity (a teacher)
 * was drawn two different ways one click apart.
 */
function EmptyTeachers({ canAssign }: { canAssign: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-10">
      <GraduationCap className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
      <p className="text-sm font-medium text-text-strong">
        {t("dept_course_detail.empty_teachers_title")}
      </p>
      {canAssign && (
        <p className="text-xs text-text-muted mt-1">
          {t("dept_course_detail.empty_teachers_body")}
        </p>
      )}
    </div>
  );
}

/**
 * Staffing projections for the teachers tab, derived from the readiness query
 * (which mirrors the publish gate) + the already-fetched teacher list.
 */
function useTeacherStaffing(
  courseId: string,
  teachers: TeacherAssignmentRead[] | null | undefined,
) {
  const readiness = useCourseReadiness(courseId);
  const allTeachers = teachers ?? [];
  return {
    readiness,
    allTeachers,
    hasInstructor: allTeachers.some((a) => a.is_instructor),
    currentCount: readiness.data?.teacher_count ?? allTeachers.length,
    minTeachers: readiness.data?.min_teachers_per_course ?? 0,
    maxTeachers: readiness.data?.max_teachers_per_course ?? 0,
    hasStaffingData: Boolean(readiness.data),
  };
}

/**
 * Staffing summary line: how many teachers are on the course now, against the
 * runtime [min, max] window, with a warning when the course is at/over the
 * ceiling (assigning would exceed it) or under the floor (cannot publish).
 */
function StaffingSummary({
  current,
  min,
  max,
}: {
  current: number;
  min: number;
  max: number;
}) {
  const { t } = useTranslation();
  const overMax = max > 0 && current >= max;
  const underMin = min > 0 && current < min;
  return (
    <div className="rounded-lg border border-border bg-surface-elev px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="flex items-center gap-2 text-sm text-text-strong">
        <Users className="h-4 w-4 text-text-subtle" />
        {t("dept_course_detail.staffing_minmax", {
          current,
          min,
          max,
          count: current,
        })}
      </span>
      {overMax && (
        <span className="text-xs text-danger">
          {t("dept_course_detail.staffing_at_max")}
        </span>
      )}
      {underMin && (
        <span className="text-xs text-warning">
          {t("dept_course_detail.staffing_under_min", { min })}
        </span>
      )}
    </div>
  );
}

export function DeptTeachersTab({
  active,
  teachers,
  canAssign,
  courseId,
}: {
  active: boolean;
  teachers: ListQueryState<TeacherAssignmentRead>;
  canAssign: boolean;
  courseId: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const {
    hasInstructor,
    currentCount,
    minTeachers,
    maxTeachers,
    hasStaffingData,
  } = useTeacherStaffing(courseId, teachers.data);

  const rows = useMemo(() => {
    const all = teachers.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((a) =>
      [a.display_name, a.primary_email]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(q)),
    );
  }, [teachers.data, query]);

  const columns: DataTableColumn<TeacherAssignmentRead>[] = useMemo(
    () => [
      {
        id: "teacher",
        header: t("dept_course_detail.col_teacher"),
        sortable: true,
        sortValue: (a) =>
          (a.display_name || a.primary_email).toLowerCase(),
        cell: (a) => <TeacherIdentityCell assignment={a} />,
      },
    ],
    [t],
  );

  if (!active) return null;

  return (
    <div className="space-y-4">
      <StaffingSummary
        current={currentCount}
        min={minTeachers}
        max={maxTeachers}
      />

      {canAssign && (
        <AssignTeacherForm
          courseId={courseId}
          currentCount={currentCount}
          maxCount={hasStaffingData ? maxTeachers : undefined}
        />
      )}

      {teachers.isLoading ? (
        <PageSkeleton
          rows={3}
          rounded="rounded-lg"
          bg="bg-surface-muted"
          gap="space-y-2"
        />
      ) : teachers.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("dept_course_detail.load_failed_teachers")}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(a) => a.user_id}
          actions={
            canAssign
              ? (a) => (
                  <TeacherRowActions
                    assignment={a}
                    courseId={courseId}
                    hasAnotherInstructor={hasInstructor && !a.is_instructor}
                  />
                )
              : undefined
          }
          actionsHeader={canAssign ? t("dept_courses.col_actions") : undefined}
          emptyState={
            query ? (
              t("dept_course_detail.empty_search_teachers")
            ) : (
              <EmptyTeachers canAssign={canAssign} />
            )
          }
          toolbar={
            (teachers.data ?? []).length > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onClear={query ? () => setQuery("") : undefined}
                  placeholder={t("dept_course_detail.search_teachers")}
                  wrapperClassName="w-full sm:w-72"
                  aria-label={t("dept_course_detail.search_teachers")}
                />
                <p className="text-xs text-text-muted">
                  {t("dept_course_detail.teacher_count", {
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
