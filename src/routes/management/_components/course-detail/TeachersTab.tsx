import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { useConfirm } from "@/components/ui/use-confirm";
import { getApiErrorMessage } from "@/lib/api/error-codes";
import { useBulkRemoveTeachers, useCourseReadiness } from "@/lib/api/hooks/dept";
import type { TeacherAssignmentRead } from "@/lib/api/types";
import { AssignTeacherForm } from "./AssignTeacherForm";
import { TeacherIdentityCell, TeacherRowActions } from "./TeacherRow";
import type { ListQueryState } from "./types";

/**
 * Teachers tab — a DataTable, matching the `/management/courses` worklist this page is
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
 *
 * Inline rather than a card. It is one short sentence, and as a full-width
 * bordered box it was the first of four stacked containers a manager had to
 * scroll past to reach the list.
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
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex items-center gap-2 text-sm text-text-strong">
        <Users aria-hidden="true" className="h-4 w-4 text-text-subtle" />
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
    </span>
  );
}

/**
 * The table's toolbar: staffing summary + search on the first row, the bulk
 * bar OR the assign form on the second. `justify-between` spreads each row
 * across the full toolbar width so the search field and the assign row sit
 * at opposite edges instead of clustering left.
 */
function TeachersToolbar({
  currentCount,
  minTeachers,
  maxTeachers,
  hasStaffingData,
  query,
  onQueryChange,
  hasTeachers,
  canAssign,
  selectedCount,
  onClearSelection,
  onBulkRemove,
  bulkPending,
  courseId,
}: {
  currentCount: number;
  minTeachers: number;
  maxTeachers: number;
  hasStaffingData: boolean;
  query: string;
  onQueryChange: (next: string) => void;
  hasTeachers: boolean;
  canAssign: boolean;
  selectedCount: number;
  onClearSelection: () => void;
  onBulkRemove: () => void;
  bulkPending: boolean;
  courseId: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      {/* First row: staffing summary left, the table search pinned right —
          ml-auto guarantees the gap opens between them regardless of how the
          staffing line wraps. */}
      <div className="flex flex-wrap items-center gap-3">
        <StaffingSummary
          current={currentCount}
          min={minTeachers}
          max={maxTeachers}
        />
        {/* Search earns its place only once there is a list worth
            narrowing; two rows do not need a filter. */}
        {hasTeachers ? (
          <div className="ml-auto w-full sm:w-64">
            <SearchInput
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onClear={query ? () => onQueryChange("") : undefined}
              placeholder={t("dept_course_detail.search_teachers")}
              aria-label={t("dept_course_detail.search_teachers")}
            />
          </div>
        ) : null}
      </div>

      {/* Bulk bar replaces the assign row while a selection is live:
          the two are different intents, and stacking both would put
          an "Add" and a "Remove" side by side over the same list. */}
      {canAssign && selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-m3-surface-container px-3 py-2">
          <span className="text-sm font-medium text-text-strong">
            {t("dept_course_detail.bulk_selected", {
              count: selectedCount,
            })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-danger hover:bg-red-50"
            disabled={bulkPending}
            onClick={onBulkRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("dept_course_detail.bulk_remove")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
          >
            {t("dept_course_detail.bulk_clear")}
          </Button>
        </div>
      ) : null}

      {/* Assign stays ALWAYS rendered, including on an empty course.
          It used to live above the table and was fine, but the toolbar it
          moved into was previously suppressed when the list was empty —
          which is exactly when a manager needs to assign someone. The form
          justifies its own contents so the picker sits left and the flags +
          Add button reach the right edge, mirroring the row above. */}
      {canAssign && selectedCount === 0 ? (
        <AssignTeacherForm
          courseId={courseId}
          currentCount={currentCount}
          maxCount={hasStaffingData ? maxTeachers : undefined}
        />
      ) : null}
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const bulkRemove = useBulkRemoveTeachers(courseId);
  const { confirm, dialog } = useConfirm({
    title: "Remove selected instructors?",
    confirmLabel: "Remove",
    cancelLabel: "Cancel",
  });
  const {
    hasInstructor,
    currentCount,
    minTeachers,
    maxTeachers,
    hasStaffingData,
  } = useTeacherStaffing(courseId, teachers.data);

  const hasTeachers = (teachers.data ?? []).length > 0;

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

  async function handleBulkRemove() {
    const ok = await confirm({
      description: t("dept_course_detail.bulk_remove_confirm", {
        count: selectedIds.size,
      }),
    });
    if (!ok) return;
    try {
      await bulkRemove.mutateAsync([...selectedIds]);
      toast.success(
        t("dept_course_detail.bulk_remove_done", { count: selectedIds.size }),
      );
      setSelectedIds(new Set());
    } catch (error: unknown) {
      // The call is all-or-nothing, so a failure means NOTHING was removed —
      // keep the selection so the manager can adjust it and retry rather
      // than having to re-tick everyone.
      toast.error(
        getApiErrorMessage(error, t("dept_course_detail.bulk_remove_failed")),
      );
    }
  }

  if (!active) return null;

  return (
    // A single container. Staffing, assignment and search were three
    // full-width cards stacked above the table, each holding one line or one
    // control — roughly 250px of chrome before the manager saw a name. They
    // are now the table's toolbar.
    <div>
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
          selectable={canAssign}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
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
            <TeachersToolbar
              currentCount={currentCount}
              minTeachers={minTeachers}
              maxTeachers={maxTeachers}
              hasStaffingData={hasStaffingData}
              query={query}
              onQueryChange={setQuery}
              hasTeachers={hasTeachers}
              canAssign={canAssign}
              selectedCount={selectedIds.size}
              onClearSelection={() => setSelectedIds(new Set())}
              onBulkRemove={() => void handleBulkRemove()}
              bulkPending={bulkRemove.isPending}
              courseId={courseId}
            />
          }
        />
      )}
      {dialog}
    </div>
  );
}
