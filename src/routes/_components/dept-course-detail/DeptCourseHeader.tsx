import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import type { CourseAuthoring } from "@/lib/api/types";
import { DeleteCourseButton } from "./DeleteCourseButton";

/** Dept course header: back link, title, slug, and the manager-only delete. */
export function DeptCourseHeader({
  course,
  courseId,
  canDelete,
}: {
  course: CourseAuthoring | undefined;
  courseId: string;
  canDelete: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <Link
        to="/dept"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-m3-primary transition-colors mb-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("dept_course_detail.back")}
      </Link>
      <h1 className="text-2xl font-headline font-bold text-text-strong">
        {course?.title ?? t("dept_course_detail.course_fallback")}
      </h1>
      {course?.slug && (
        <p className="text-sm text-text-muted mt-1">{course.slug}</p>
      )}
      {canDelete && course && (
        <div className="mt-3">
          <DeleteCourseButton courseId={courseId} courseTitle={course.title} />
        </div>
      )}
    </div>
  );
}
