import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { apiDelete, apiPost } from "@/lib/api/client";
import {
  useArchiveCareerPath,
  useCareerPathCourses,
  usePublishCareerPath,
} from "@/lib/api/hooks/career-paths";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  CareerPathCourseAuthoring,
  CourseAuthoring,
} from "@/lib/api/types";

/**
 * Publish/archive lifecycle for the detail header: the two mutations, the
 * inline confirm state, and the toast handling.
 *
 * Publish is gated twice: the inline confirm bar first, then — when the
 * path still holds DRAFT course(s), which the backend's publish gate
 * rejects — a decision dialog (publish the courses, or drop them from the
 * path). `t` is injected rather than resolved here so the hook adds no
 * extra `useTranslation` call.
 */
export function usePathActions(id: string, t: TFunction) {
  const qc = useQueryClient();
  const publish = usePublishCareerPath(id);
  const archive = useArchiveCareerPath(id);
  const pathCourses = useCareerPathCourses(id);
  const [confirming, setConfirming] = useState<"publish" | "archive" | null>(
    null,
  );
  const [draftCourses, setDraftCourses] = useState<
    CareerPathCourseAuthoring[] | null
  >(null);
  const [dialogAction, setDialogAction] = useState<"publish" | "remove" | null>(
    null,
  );

  function doPublish() {
    publish.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("management_career_path_detail.toasts.published"));
        setConfirming(null);
      },
      onError: (err) => {
        const e = err as { status?: number; message?: string };
        const message =
          e.status && e.status >= 400 && e.status < 500
            ? t("management_career_path_detail.errors.publish_needs_course")
            : e.message ||
              t("management_career_path_detail.errors.publish_failed");
        toast.error(message);
        setConfirming(null);
      },
    });
  }

  function handlePublish() {
    const rows = pathCourses.data ?? [];
    const drafts = rows.filter((r) => r.course_status !== "published");
    if (drafts.length > 0) {
      // The backend gate would 409 — let the manager decide first.
      setDraftCourses(drafts);
      return;
    }
    doPublish();
  }

  /** Publish every draft course, then publish the path. */
  async function handlePublishCoursesThenPath() {
    if (!draftCourses) return;
    setDialogAction("publish");
    const prefix = "management_career_path_detail.publish_dialog";
    for (const course of draftCourses) {
      try {
        await apiPost<CourseAuthoring>(`/teacher/courses/${course.course_id}/publish`);
      } catch (err) {
        toast.error(
          t(`${prefix}.publish_course_failed`, {
            course: course.course_title,
            reason: (err as { message?: string }).message || "",
          }),
        );
        setDialogAction(null);
        return;
      }
    }
    await refreshCourseRows();
    setDraftCourses(null);
    setDialogAction(null);
    doPublish();
  }

  /** Drop every draft course from the path, then publish the path. */
  async function handleRemoveCoursesThenPublish() {
    if (!draftCourses) return;
    setDialogAction("remove");
    const prefix = "management_career_path_detail.publish_dialog";
    for (const course of draftCourses) {
      try {
        await apiDelete(
          `/management/career-paths/${id}/courses/${course.course_id}`,
        );
      } catch (err) {
        toast.error(
          t(`${prefix}.remove_course_failed`, {
            course: course.course_title,
            reason: (err as { message?: string }).message || "",
          }),
        );
        setDialogAction(null);
        return;
      }
    }
    await refreshCourseRows();
    setDraftCourses(null);
    setDialogAction(null);
    doPublish();
  }

  function refreshCourseRows() {
    return qc.invalidateQueries({
      queryKey: queryKeys.careerPaths.managementCourses(id),
    });
  }

  function handleArchive() {
    archive.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("management_career_path_detail.toasts.archived"));
        setConfirming(null);
      },
      onError: (err) => {
        toast.error(
          (err as Error).message ||
            t("management_career_path_detail.errors.archive_failed"),
        );
        setConfirming(null);
      },
    });
  }

  function closePublishDialog() {
    if (dialogAction !== null) return;
    setDraftCourses(null);
  }

  return {
    publish,
    archive,
    confirming,
    setConfirming,
    handlePublish,
    handleArchive,
    publishDecision: {
      draftCourses,
      dialogAction,
      onPublishCourses: handlePublishCoursesThenPath,
      onRemoveCourses: handleRemoveCoursesThenPublish,
      onClose: closePublishDialog,
    },
  };
}
