import { CohortOverviewCard } from "./_components/course-students/CohortOverviewCard";
import { CohortStatCards } from "./_components/course-students/CohortStatCards";
import { QuickFiltersCard } from "./_components/course-students/QuickFiltersCard";
import { RosterFilterBar } from "./_components/course-students/RosterFilterBar";
import { RosterTable } from "./_components/course-students/RosterTable";
import { StudentsPageHeader } from "./_components/course-students/StudentsPageHeader";
import { TopPerformerCard } from "./_components/course-students/TopPerformerCard";
import { useCourseStudentsController } from "./_components/course-students/use-course-students-controller";

/**
 * Course Students (roster) tab. Cohort stats, a searchable/sortable roster and
 * a sticky sidebar of cohort insight.
 *
 * Thin orchestrator: state and derived values live in
 * `useCourseStudentsController`, every piece of the surface in
 * `_components/course-students/`. The course title and the tab bar are
 * rendered by the shell above this.
 */
export default function CourseStudentsPage() {
  const controller = useCourseStudentsController();

  return (
    <div className="max-w-[1440px] mx-auto pb-16">
      {/* ── Header ── (course title + tabs live in the shell above) */}
      <StudentsPageHeader controller={controller} />

      {/* ── 12-col grid ── */}
      <div className="grid grid-cols-12 gap-6">
        {/* ── Main 8 cols ── */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <CohortStatCards controller={controller} />
          <RosterFilterBar controller={controller} />
          <RosterTable controller={controller} />
        </div>

        {/* ── Sidebar 4 cols ── */}
        <div className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-24 self-start">
          <CohortOverviewCard controller={controller} />
          <QuickFiltersCard controller={controller} />
          {controller.students.length > 0 && (
            <TopPerformerCard controller={controller} />
          )}
        </div>
      </div>
    </div>
  );
}
