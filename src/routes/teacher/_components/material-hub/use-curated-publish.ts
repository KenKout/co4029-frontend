import type { TFunction } from "i18next";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { toast } from "sonner";

import {
  useCuratedKnowledgeGraph,
  usePublishCuratedKnowledgeGraph,
  useSaveCuratedKnowledgeGraph,
  useUnpublishCuratedKnowledgeGraph,
} from "@/lib/api/hooks/materials";
import type { CuratedKGDraft } from "@/lib/api/types";

/**
 * The curated-graph publish cluster of {@link KnowledgeGraphPreview}, extracted
 * verbatim from the former 1422-line material-hub.tsx.
 *
 * Hook call order is preserved EXACTLY as it was inline: curated draft → save →
 * publish → confirm dialog state. `t` is passed in (rather than pulled from
 * useTranslation here) so the caller's hook order is untouched too.
 */
export interface CuratedPublishController {
  curatedData: CuratedKGDraft | undefined;
  curatedNodeCount: number;
  canPublish: boolean;
  /** Seed was the placeholder "Main concept" node (no real AI graph yet). */
  seededPlaceholder: boolean;
  needsSaveBeforePublish: boolean;
  publishBusy: boolean;
  isFullyPublished: boolean;
  confirmPublish: boolean;
  setConfirmPublish: Dispatch<SetStateAction<boolean>>;
  handlePublishCurated: () => Promise<void>;
  unpublishBusy: boolean;
  handleUnpublish: () => Promise<void>;
}

export function useCuratedPublish(
  lessonId: string,
  t: TFunction,
): CuratedPublishController {
  // Curated draft. Fetched whenever the card is mounted (not just when the
  // detail screen opens) because the card's Publish button needs to know
  // whether a graph exists and whether it has unpublished changes. Doubles as
  // the detail screen's data when the Curated source is selected, so both
  // modes render the SAME graph the editor writes to.
  const { data: curatedData } = useCuratedKnowledgeGraph(lessonId);
  const saveCurated = useSaveCuratedKnowledgeGraph(lessonId);
  const publishCurated = usePublishCuratedKnowledgeGraph(lessonId);
  const unpublishCurated = useUnpublishCuratedKnowledgeGraph(lessonId);
  // Publish is a student-visible action, so it goes through a confirmation.
  const [confirmPublish, setConfirmPublish] = useState(false);

  const curatedNodeCount = curatedData?.nodes.length ?? 0;
  // The placeholder seed (single "Main concept" node produced when the AI
  // graph is off/empty) must NOT be publishable: publishing it shows students
  // a meaningless one-node graph. The backend refuses it with 409 too — this
  // hides the action before the teacher even tries.
  const seededPlaceholder = curatedData?.seeded_placeholder ?? false;
  // Publish needs a graph with at least one node — that's the backend's only
  // real requirement (it rejects an empty draft with 409).
  //
  // It deliberately does NOT require `exists`. A never-saved draft is seeded
  // from the AI graph and has nodes; gating on `exists` hid the button in
  // exactly that case, which is why publishing a fresh lesson was impossible.
  // Instead we SAVE the seeded draft first — see handlePublishCurated.
  const canPublish = curatedNodeCount > 0 && !seededPlaceholder;

  // The server has nothing (or something stale) for this lesson, so publishing
  // alone would 409 / publish the wrong graph. Drives "Save and publish".
  const needsSaveBeforePublish =
    !curatedData?.exists || !!curatedData?.has_unpublished_changes;

  const publishBusy = saveCurated.isPending || publishCurated.isPending;

  // Live snapshot already matches the draft — nothing left to publish, so the
  // card shows a "Published" marker instead of the button.
  const isFullyPublished =
    !!curatedData?.is_published && !curatedData?.has_unpublished_changes;

  async function handlePublishCurated() {
    if (!curatedData) return;
    try {
      // Publish snapshots the PERSISTED draft_json. A seeded-but-unsaved draft
      // has no row at all, so publish must be preceded by a save or the backend
      // raises 409 ("save a draft with at least one primary node first").
      if (needsSaveBeforePublish) {
        await saveCurated.mutateAsync({
          nodes: curatedData.nodes,
          edges: curatedData.edges,
        });
      }
      await publishCurated.mutateAsync();
      toast.success(t("teacher_kg_editor.published"));
      setConfirmPublish(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("teacher_kg_editor.publish_failed"),
      );
    }
  }

  // Roll the published graph back: students lose the panel, the draft stays
  // for re-publishing after fixes. This is the "publish is one-way" gap —
  // a graph published by mistake could never be removed before.
  async function handleUnpublish() {
    if (!curatedData?.is_published) return;
    try {
      await unpublishCurated.mutateAsync();
      toast.success(t("teacher_kg_editor.unpublished"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("teacher_kg_editor.publish_failed"),
      );
    }
  }

  return {
    curatedData,
    curatedNodeCount,
    canPublish,
    seededPlaceholder,
    needsSaveBeforePublish,
    publishBusy,
    isFullyPublished,
    confirmPublish,
    setConfirmPublish,
    handlePublishCurated,
    unpublishBusy: unpublishCurated.isPending,
    handleUnpublish,
  };
}
