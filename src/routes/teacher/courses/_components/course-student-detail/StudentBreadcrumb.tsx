import { useTranslation } from "react-i18next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

import type { CourseDetailData } from "./use-course-student-detail-controller";

/**
 * Courses → course → Students → student breadcrumb, on the standard
 * Breadcrumbs component (was a hand-rolled Link/ArrowRight trail).
 */
export function StudentBreadcrumb({
  courseId,
  course,
  studentName,
}: {
  courseId: string;
  course: CourseDetailData;
  studentName: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="pt-4 pb-6">
      <Breadcrumbs
        items={[
          {
            label: t("teacher_common.breadcrumb_teaching"),
            to: "/teacher/courses",
          },
          {
            label: course?.title ?? t("teacher_common.breadcrumb_course"),
            to: "/teacher/courses/$courseId",
            params: { courseId },
          },
          {
            label: t("teacher_common.nav_students"),
            to: "/teacher/courses/$courseId/students",
            params: { courseId },
          },
          { label: studentName },
        ]}
      />
    </div>
  );
}
