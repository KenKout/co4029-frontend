import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CourseAuthoring } from "@/lib/api/types";
import { usePermissions } from "@/lib/auth/use-permissions";
import { ImportSyllabusDialog } from "../courses/ImportSyllabusDialog";
import { CloneCourseButton } from "./CloneCourseButton";
import { DeleteCourseButton } from "./DeleteCourseButton";
import { DeptCourseLifecycleActions } from "./DeptCourseLifecycleActions";

/**
 * Dept course header: back link, course identity (read-only) and the
 * manager-only actions — Upload syllabus / Publish / Archive / Delete at the
 * top of the page.
 *
 * The lifecycle buttons live here (not inside the collapsible Course
 * Settings panel) so a manager sees the publish decision without opening
 * anything; they render under the same `canDelete` (`course.delete`) gate
 * as the Settings tab.
 *
 * "Upload syllabus" opens the same dialog as the course list, in its
 * course-scoped shape: the mode selector (upload only / override / create new)
 * appears because there is a course to upload ONTO. Its own permission gate is
 * stricter than `canDelete` — the endpoint needs `course.create` AND
 * `learning_outcome.manage`, so the button mirrors both rather than 403-ing.
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
  const permissions = usePermissions();
  const [importOpen, setImportOpen] = useState(false);
  // Same two codes the backend stacks on the import endpoint (course.create +
  // learning_outcome.manage): the upload writes learning outcomes in override
  // mode, and gating on course.create alone would be a side door into LO
  // authoring — mirrored here so the button is absent rather than broken.
  const canImport =
    permissions.hasAny("course.create", "system.administer") &&
    permissions.hasAny("learning_outcome.manage", "system.administer");

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
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="min-w-0 flex-1 text-2xl font-headline font-bold text-text-strong truncate">
              {course?.title ?? t("dept_course_detail.course_fallback")}
            </h1>
            {course && <DeptCourseStatusBadge status={course.status} />}
          </div>
          {course?.slug && (
            <p className="text-sm text-text-muted font-mono mt-0.5 truncate">
              {course.slug}
            </p>
          )}
        </div>
        {canDelete && course && (
          <div className="flex items-center gap-2 shrink-0">
            {canImport && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="h-4 w-4" />
                {t("dept_course_detail.upload_syllabus")}
              </Button>
            )}
            <DeptCourseLifecycleActions courseId={courseId} course={course} />
            <CloneCourseButton courseId={courseId} courseTitle={course.title} />
            <DeleteCourseButton courseId={courseId} courseTitle={course.title} />
          </div>
        )}
      </div>

      {canImport && course && (
        <ImportSyllabusDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          courseId={courseId}
          courseStatus={course.status}
        />
      )}
    </div>
  );
}

/** Status pill rendered next to the course name in the header. */
function DeptCourseStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const pillClass =
    status === "published"
      ? "bg-emerald-50 text-emerald-700"
      : status === "archived"
        ? "bg-amber-50 text-amber-700"
        : "bg-m3-surface-container text-m3-on-surface-variant";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${pillClass}`}
    >
      {status === "published" && <CheckCircle2 className="h-3.5 w-3.5" />}
      {t(`teacher_course_settings.status_${status}`)}
    </span>
  );
}
