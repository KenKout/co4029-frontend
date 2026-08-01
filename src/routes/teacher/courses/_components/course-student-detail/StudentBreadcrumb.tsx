import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

import type { CourseDetailData } from "./use-course-student-detail-controller";

/**
 * Courses → course → Students → student breadcrumb, extracted verbatim from
 * the former 659-line course-student-detail.tsx.
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
    <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant pt-4 pb-6">
      <Link
        to="/teacher/courses"
        className="hover:text-m3-primary transition-colors"
      >
        {t("teacher_courses_list.title")}
      </Link>
      <ArrowRight className="h-3 w-3" />
      <Link
        to="/teacher/courses/$courseId"
        params={{ courseId }}
        className="hover:text-m3-primary transition-colors truncate max-w-[140px]"
      >
        {course?.title ?? "…"}
      </Link>
      <ArrowRight className="h-3 w-3" />
      <Link
        to="/teacher/courses/$courseId/students"
        params={{ courseId }}
        className="hover:text-m3-primary transition-colors"
      >
        Students
      </Link>
      <ArrowRight className="h-3 w-3" />
      <span className="text-m3-on-surface font-medium truncate max-w-[160px]">
        {studentName}
      </span>
    </div>
  );
}
