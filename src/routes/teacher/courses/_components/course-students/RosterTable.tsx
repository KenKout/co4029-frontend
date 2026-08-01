import { RosterSkeleton } from "./RosterSkeleton";
import { EmptyRosterState, NoMatchingStudentsState } from "./RosterEmptyStates";
import { RosterRow } from "./RosterRow";
import type { CourseStudentsController } from "./use-course-students-controller";

/**
 * The roster table — column header, the loading placeholder, the two empty
 * states and the row list. Extracted verbatim from the former 658-line
 * course-students.tsx; the loading / empty / no-match / rows branch keeps its
 * original nesting so the rendered tree is unchanged.
 */
export function RosterTable({
  controller,
}: {
  controller: CourseStudentsController;
}) {
  const {
    isLoading,
    filtered,
    students,
    courseId,
    setSearch,
    setStatusFilter,
  } = controller;
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-[auto_1fr_130px_100px_90px_40px] gap-4 items-center px-5 py-3 border-b border-m3-outline-variant/10">
        <div className="w-10" />
        <span className="text-[10px] font-bold text-m3-on-surface-variant uppercase tracking-wider">
          Student
        </span>
        <span className="text-[10px] font-bold text-m3-on-surface-variant uppercase tracking-wider">
          Progress
        </span>
        <span className="text-[10px] font-bold text-m3-on-surface-variant uppercase tracking-wider">
          Risk
        </span>
        <span className="text-[10px] font-bold text-m3-on-surface-variant uppercase tracking-wider">
          Active
        </span>
        <div />
      </div>

      {isLoading ? (
        <RosterSkeleton />
      ) : filtered.length === 0 ? (
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
      ) : (
        <div className="divide-y divide-m3-outline-variant/10">
          {filtered.map((student) => (
            <RosterRow
              key={student.student_id}
              student={student}
              courseId={courseId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
