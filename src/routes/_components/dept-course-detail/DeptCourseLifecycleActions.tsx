import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCourseReadiness } from "@/lib/api/hooks/dept";
import {
  useArchiveCourse,
  usePublishCourse,
} from "@/lib/api/hooks/teacher-courses";
import type { CourseAuthoring } from "@/lib/api/types";

/**
 * Course lifecycle actions for the dept course header: status pill +
 * Publish (draft only) + Archive buttons, right next to the Delete button.
 *
 * Moved out of the collapsible Course Settings panel (`CourseSettingsLifecycle`)
 * so the publish decision sits at the top of the page instead of hiding
 * behind a collapsed panel. Same backend gates, same readiness numbers:
 * publish disables itself with the reason in a tooltip when the course has
 * no gradeable unit or learning outcome; the backend 409 remains the
 * authority if the readiness data is stale.
 *
 * Manager surface only — this renders under the same `canDelete`
 * (`course.delete`) gate that shows the Settings tab.
 */
export function DeptCourseLifecycleActions({
  courseId,
  course,
}: {
  courseId: string;
  course: CourseAuthoring | undefined;
}) {
  const { t } = useTranslation();
  const publish = usePublishCourse(courseId);
  const archive = useArchiveCourse(courseId);
  const readiness = useCourseReadiness(courseId);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const status = course?.status ?? "draft";
  const publishBlocked =
    !readiness.data ||
    readiness.data.gradeable_unit_count === 0 ||
    readiness.data.learning_outcome_count === 0;

  async function runPublish() {
    try {
      await publish.mutateAsync();
      toast.success(t("teacher_course_settings.publish_success"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_course_settings.publish_failed"),
      );
    }
  }

  async function runArchive() {
    try {
      await archive.mutateAsync();
      toast.success(t("teacher_course_settings.archive_success"));
      setArchiveConfirmOpen(false);
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_course_settings.archive_failed"),
      );
      setArchiveConfirmOpen(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {status === "draft" && (
          <Button
            type="button"
            onClick={runPublish}
            disabled={publish.isPending || publishBlocked}
            title={
              publishBlocked
                ? t("teacher_course_settings.publish_blocked")
                : t("teacher_course_settings.publish")
            }
            className="gap-2 bg-m3-primary text-white hover:bg-m3-primary/90"
          >
            {publish.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {t("teacher_course_settings.publish")}
          </Button>
        )}

        {status !== "archived" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setArchiveConfirmOpen(true)}
            disabled={archive.isPending}
            className="gap-2"
          >
            {archive.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            {t("teacher_course_settings.archive")}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title={t("teacher_course_settings.archive_confirm_title")}
        description={t("teacher_course_settings.archive_confirm_body", {
          title: course?.title ?? "",
        })}
        confirmLabel={t("teacher_course_settings.archive")}
        cancelLabel={t("common.cancel", "Cancel")}
        onConfirm={runArchive}
        isPending={archive.isPending}
      />
    </>
  );
}
