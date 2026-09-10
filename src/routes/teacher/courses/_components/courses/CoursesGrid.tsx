import { useTranslation } from "react-i18next";

import { TeacherCourseCard } from "@/routes/teacher/_components/TeacherCourseCard";

import { TeacherCourseListRow } from "./TeacherCourseListRow";
import type { TeacherCoursesController } from "./use-courses-controller";

/**
 * Result count + the course card grid. Extracted verbatim from the former
 * 234-line courses.tsx, including the fragment that keeps the count line a
 * sibling of the grid inside the page's `space-y-6` stack.
 */
export function CoursesGrid({
  controller,
}: {
  controller: TeacherCoursesController;
}) {
  const { t } = useTranslation();
  const { filtered, courses, viewMode } = controller;
  return (
    <>
      {/* Result count — orients the teacher once the list is filtered. */}
      <p className="text-xs text-m3-on-surface-variant">
        {t("teacher_courses_list.showing_count", {
          count: filtered.length,
          total: courses.length,
          defaultValue: "Showing {{count}} of {{total}}",
        })}
      </p>
      {viewMode === "list" ? (
        <div className="space-y-3">
          {filtered.map((course, i) => (
            <TeacherCourseListRow key={course.id} course={course} index={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((course, i) => (
            <TeacherCourseCard key={course.id} course={course} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
