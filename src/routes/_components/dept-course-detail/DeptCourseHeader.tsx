import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import type { CourseAuthoring } from "@/lib/api/types";
import { DeleteCourseButton } from "./DeleteCourseButton";
import { DeptCourseLifecycleActions } from "./DeptCourseLifecycleActions";

/**
 * Dept course header: back link, course identity (read-only) and the
 * manager-only actions — Publish / Archive / Delete at the top of the page.
 *
 * The lifecycle buttons live here (not inside the collapsible Course
 * Settings panel) so a manager sees the publish decision without opening
 * anything; they render under the same `canDelete` (`course.delete`) gate
 * as the Settings tab.
 *
 * The inline title/slug editor that used to live here was removed: the
 * Settings tab's `CourseSettingsPanel scope="manager"` already renders the
 * same two fields against the same PATCH (see `CourseSettingsMetaFields`,
 * whose docstring notes title/slug render only for `scope="manager"`). Two
 * editors for one pair of fields on one page meant a manager could open both,
 * and whichever saved last silently won. Identity now has exactly one home.
 */
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

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="min-w-0 flex-1 text-2xl font-headline font-bold text-text-strong truncate">
            {course?.title ?? t("dept_course_detail.course_fallback")}
          </h1>
          {course?.slug && (
            <p className="text-sm text-text-muted font-mono mt-0.5 truncate">
              {course.slug}
            </p>
          )}
        </div>
        {canDelete && course && (
          <div className="flex items-center gap-2 shrink-0">
            <DeptCourseLifecycleActions courseId={courseId} course={course} />
            <DeleteCourseButton courseId={courseId} courseTitle={course.title} />
          </div>
        )}
      </div>
    </div>
  );
}
