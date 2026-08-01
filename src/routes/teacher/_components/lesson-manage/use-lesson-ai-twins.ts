import { toast } from "sonner";
import type { TFunction } from "i18next";
import type { LessonResource } from "@/lib/api/types/common";
import type { LearningMaterial } from "@/lib/api/types/teacher";
import type { LessonManageData } from "./types";

/**
 * Correlation between the lesson's downloadable resources and their AI Hub
 * twins, plus the actions that unblock the student live preview (claim the
 * lesson's primary-material slot, bulk-reveal hidden ready docs) and the
 * resource delete.
 *
 * Plain closures — no hooks of its own, so it does not shift the page's hook
 * order.
 */
export function useLessonAiTwins({
  t,
  data,
  showFeedback,
}: {
  t: TFunction;
  data: LessonManageData;
  showFeedback: (msg: string) => void;
}) {
  const { lesson, resources, aiMaterials, updateLesson } = data;
  const { deleteResource, bulkSetVisibility } = data;

  function handleDeleteResource(resourceId: string) {
    // Delete ONLY the downloadable resource. Do NOT cascade into the AI Hub
    // material that may share this file's storage_object_id: that material is a
    // separate, teacher-managed entity (already processed into quizzes/search/
    // KG). Auto-deleting it here silently destroyed live, working documents —
    // the teacher removed a student download and lost their processed doc. If
    // they want the AI copy gone too, they remove it explicitly in the AI Hub.
    deleteResource.mutate(resourceId, {
      onSuccess: () => showFeedback("Resource removed."),
      onError: (err) => toast.error((err as Error).message),
    });
  }

  // Correlate a resource to its AI Hub twin (same storage_object_id), or
  // undefined when the resource was never synced to AI. Drives the per-card
  // status badge AND the inline hide/show + retry actions.
  function twinForResource(
    resource: LessonResource,
  ): LearningMaterial | undefined {
    if (resource.storage_object_id == null) return undefined;
    return aiMaterials.find(
      (m: LearningMaterial) =>
        m.latest_version?.storage_object_id === resource.storage_object_id,
    );
  }

  // Claim the lesson's primary-material slot if it's currently empty. The
  // student reading pane renders ONLY `lesson.primary_material_id`, so a doc
  // with no primary set never previews for students even when visible+ready.
  // Never stomp an existing primary the teacher already chose. Best-effort —
  // a failure here shouldn't surface as a hard error on the calling action.
  function claimPrimaryIfEmpty(materialId: string) {
    if (lesson?.primary_material_id) return;
    updateLesson.mutate({ primary_material_id: materialId });
  }

  // Ready AI twins that back a downloadable resource, de-duped by id. The
  // student live preview requires BOTH: the doc is visible_to_students AND the
  // lesson's primary_material_id points at a ready doc. So the "needs fixing"
  // set is any ready twin that is either hidden OR (the lesson has no primary
  // at all — the exact ch1/ch2 case: visible but never wired as the preview).
  const readyTwins = Array.from(
    new Map(
      resources
        .map((r) => twinForResource(r))
        .filter(
          (m): m is LearningMaterial =>
            m != null && m.latest_version?.processing_status === "ready",
        )
        .map((m) => [m.id, m] as const),
    ).values(),
  );
  const hiddenReadyTwinIds = readyTwins
    .filter((m) => !m.visible_to_students)
    .map((m) => m.id);
  // The lesson's preview is unwired when there's a ready doc but no primary
  // pointer — showing/hiding visibility alone will NEVER fix this.
  const lessonPrimaryUnwired =
    !lesson?.primary_material_id && readyTwins.length > 0;
  // Show the bulk button when anything blocks the student preview.
  const needsPreviewFix = hiddenReadyTwinIds.length > 0 || lessonPrimaryUnwired;

  function handleShowAll() {
    if (!needsPreviewFix) return;
    // Always ensure the lesson has a primary pointer (pick the first ready
    // twin) — this is what fixes an already-visible-but-unwired doc.
    claimPrimaryIfEmpty(readyTwins[0]?.id);
    if (hiddenReadyTwinIds.length === 0) {
      // Nothing hidden — the only issue was the missing primary, now claimed.
      toast.success(
        t("teacher_lesson_manage.resource_ai.show_all_done", { count: 1 }),
      );
      return;
    }
    bulkSetVisibility.mutate(
      { materialIds: hiddenReadyTwinIds, visible: true },
      {
        onSuccess: ({ succeeded, failed }) => {
          if (failed > 0) {
            toast.warning(
              t("teacher_lesson_manage.resource_ai.show_all_partial", {
                succeeded,
                failed,
              }),
            );
          } else {
            toast.success(
              t("teacher_lesson_manage.resource_ai.show_all_done", {
                count: succeeded,
              }),
            );
          }
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  return {
    handleDeleteResource,
    twinForResource,
    claimPrimaryIfEmpty,
    hiddenReadyTwinIds,
    needsPreviewFix,
    handleShowAll,
  };
}
