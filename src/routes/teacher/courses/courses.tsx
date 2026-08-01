import { PageHeader } from "@/components/ui/page-header";

import {
  CoursesFirstRunState,
  CoursesNoMatchState,
} from "./_components/courses/CoursesEmptyStates";
import { CoursesGrid } from "./_components/courses/CoursesGrid";
import { CoursesGridSkeleton } from "./_components/courses/CoursesGridSkeleton";
import { CoursesToolbar } from "./_components/courses/CoursesToolbar";
import { useTeacherCoursesController } from "./_components/courses/use-courses-controller";

/**
 * Teacher Courses index: search/filter/sort toolbar and the course card grid.
 *
 * The per-status stat strip is gone: its four numbers now ride as count badges
 * on the toolbar's status tabs, which is also the control that filters by them.
 *
 * Thin orchestrator: state and derived values live in
 * `useTeacherCoursesController`, every piece of the surface in
 * `_components/courses/`.
 */
export default function TeacherCoursesPage() {
  const controller = useTeacherCoursesController();
  const { t, isLoading, filtered, courses, setSearch, setStatusFilter } =
    controller;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader title={t("teacher_courses_list.title")} />

      <CoursesToolbar controller={controller} />

      {/* Content */}
      {isLoading ? (
        <CoursesGridSkeleton />
      ) : filtered.length === 0 ? (
        courses.length === 0 ? (
          <CoursesFirstRunState />
        ) : (
          <CoursesNoMatchState
            onClearFilters={() => {
              setSearch("");
              setStatusFilter("all");
            }}
          />
        )
      ) : (
        <CoursesGrid controller={controller} />
      )}
    </div>
  );
}
