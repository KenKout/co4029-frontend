import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, CheckCircle2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCourseReadiness } from "@/lib/api/hooks/dept";
import {
  useArchiveCourse,
  usePublishCourse,
} from "@/lib/api/hooks/teacher-courses";
import type { TeacherCourse, TranslateFn } from "./types";

/**
 * Lifecycle block for the manager-scope course settings: the current status
 * badge plus Publish / Archive buttons.
 *
 * Replaces the former status `<Select>`. Status is a lifecycle decision with
 * real backend gates — publish 409s without at least one gradeable unit and
 * one learning outcome, archive 400s while the course sits on a published
 * career path — so it belongs on dedicated endpoints with explicit feedback,
 * not as a raw status string written through the settings PATCH (where a
 * stale select could silently fight the gates).
 *
 * The publish button reads the SAME numbers as `ReadinessChecklist`
 * (`useCourseReadiness` is a shared query, so this is one fetch): it disables
 * itself with the reason in a tooltip instead of surfacing a confusing 409.
 * The backend gate remains the authority — if the readiness data is stale,
 * the 409 still lands as a toast.
 *
 * Rendered only on the manager surface (`scope="manager"`); teachers never
 * see it, matching the backend's `course.delete` gate on publish/archive.
 */
export function CourseSettingsLifecycle({
  courseId,
  course,
}: {
  courseId: string;
  course: TeacherCourse | undefined;
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
    <div className="sm:col-span-2 rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_course_settings.status")}
        </label>
        <StatusPill status={status} t={t} />
      </div>

      <LifecycleActions
        status={status}
        publishPending={publish.isPending}
        archivePending={archive.isPending}
        publishBlocked={publishBlocked}
        t={t}
        onPublish={runPublish}
        onRequestArchive={() => setArchiveConfirmOpen(true)}
      />

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
    </div>
  );
}

function StatusPill({ status, t }: { status: string; t: TranslateFn }) {
  const pillClass =
    status === "published"
      ? "bg-emerald-50 text-emerald-700"
      : status === "archived"
        ? "bg-amber-50 text-amber-700"
        : "bg-m3-surface-container text-m3-on-surface-variant";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${pillClass}`}
    >
      {status === "published" && <CheckCircle2 className="h-3.5 w-3.5" />}
      {t(`teacher_course_settings.status_${status}`)}
    </span>
  );
}

function LifecycleActions({
  status,
  publishPending,
  archivePending,
  publishBlocked,
  t,
  onPublish,
  onRequestArchive,
}: {
  status: string;
  publishPending: boolean;
  archivePending: boolean;
  publishBlocked: boolean;
  t: TranslateFn;
  onPublish: () => void;
  onRequestArchive: () => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {status === "draft" && (
        <Button
          type="button"
          onClick={onPublish}
          disabled={publishPending || publishBlocked}
          title={
            publishBlocked
              ? t("teacher_course_settings.publish_blocked")
              : t("teacher_course_settings.publish")
          }
          className="gap-2 bg-m3-primary text-white hover:bg-m3-primary/90"
        >
          {publishPending ? (
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
          onClick={onRequestArchive}
          disabled={archivePending}
          className="gap-2"
        >
          {archivePending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          {t("teacher_course_settings.archive")}
        </Button>
      )}
    </div>
  );
}
