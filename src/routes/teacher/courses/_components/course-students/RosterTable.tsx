import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/ui/data-table";
import type { RosterStudent } from "@/lib/api/types/teacher";

import { EmptyRosterState, NoMatchingStudentsState } from "./RosterEmptyStates";
import { buildRosterColumns } from "./roster-columns";
import type { CourseStudentsController } from "./use-course-students-controller";

/**
 * The roster, as a real <DataTable>.
 *
 * Previously a hand-built CSS grid (`sm:grid-cols-[…]` repeated in both the
 * header and every row, which had to be kept in step by hand) with sorting
 * driven from a separate dropdown. Now the shared table owns the grid, the
 * header, the loading rows and the sort affordance; the columns themselves
 * live in `roster-columns.tsx` (repo's `build*Columns` factory shape).
 *
 * Row navigation: rows are clickable via `onRowClick`, but a click handler is
 * not a link — it can't be middle-clicked, opened in a new tab, or read as a
 * link by assistive tech. The trailing chevron is therefore a real <Link> to
 * the same destination, so the row keeps a genuine anchor.
 */
export function RosterTable({
  controller,
}: {
  controller: CourseStudentsController;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    isLoading,
    filtered,
    students,
    courseId,
    setSearch,
    setStatusFilter,
    sort,
    onSortChange,
  } = controller;

  const columns = buildRosterColumns(t);

  return (
    <DataTable<RosterStudent>
      columns={columns}
      data={filtered}
      getRowId={(s) => s.student_id}
      sort={sort}
      onSortChange={onSortChange}
      loading={isLoading}
      onRowClick={(student) =>
        void navigate({
          to: "/teacher/courses/$courseId/students/$studentId",
          params: { courseId, studentId: student.student_id },
        })
      }
      rowClassName={() => "cursor-pointer group"}
      // A real anchor per row: keeps middle-click / new-tab / link semantics
      // that `onRowClick` alone would have thrown away.
      actions={(student) => (
        <Link
          to="/teacher/courses/$courseId/students/$studentId"
          params={{ courseId, studentId: student.student_id }}
          aria-label={student.display_name}
          className="inline-flex items-center justify-end text-m3-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
      emptyState={
        students.length === 0 ? (
          <EmptyRosterState />
        ) : (
          <NoMatchingStudentsState
            onClearFilters={() => {
              setSearch("");
              setStatusFilter("all");
            }}
          />
        )
      }
      containerClassName="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden"
    />
  );
}
