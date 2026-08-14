import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { CoursePublic } from "@/lib/api/types";

/**
 * The page header: breadcrumb nav only ("Keep as it" — the hero body now
 * lives in the full-width CourseCard below it).
 */
export function CourseBreadcrumb({ course }: { course: CoursePublic }) {
  const { t } = useTranslation();

  return (
    <nav className="flex items-center gap-2 text-xs text-m3-on-surface-variant mb-6">
      <Link
        to="/courses"
        className="hover:text-m3-primary transition-colors"
      >
        {t("course_detail.breadcrumb_courses")}
      </Link>
      <span>/</span>
      <span className="text-m3-on-surface truncate">{course.title}</span>
    </nav>
  );
}
