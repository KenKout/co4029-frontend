import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { KnowledgeGraphDetail } from "../knowledge-graph-detail";
import { KnowledgeGraphEditor } from "../knowledge-graph-editor";
import { projectCuratedGraph, resolveDetailGraph } from "./kg-projection";
import type { KgPreviewController } from "./use-kg-preview";

/**
 * The three things the preview mounts above itself: the full-screen explorer,
 * the curated-KG editor, and the publish confirmation. Extracted verbatim from
 * the former 1422-line material-hub.tsx.
 */
export function KgPreviewOverlays({
  lessonId,
  kg,
}: {
  lessonId: string;
  kg: KgPreviewController;
}) {
  const { t } = useTranslation();
  const {
    data,
    detailData,
    expanded,
    setExpanded,
    kgSource,
    setKgSource,
    editing,
    setEditing,
    publish,
  } = kg;
  const {
    curatedData,
    curatedNodeCount,
    needsSaveBeforePublish,
    publishBusy,
    confirmPublish,
    setConfirmPublish,
    handlePublishCurated,
  } = publish;

  return (
    <>
      {/* Full-screen explorer. Prefer the fuller detail fetch (limit=60) once
          it lands; fall back to the preview data so opening feels instant
          rather than waiting on the larger request. */}
      {expanded && (
        <KnowledgeGraphDetail
          data={
            kgSource === "curated"
              ? projectCuratedGraph(lessonId, curatedData)
              : resolveDetailGraph(lessonId, detailData, data)
          }
          title={t("teacher_lesson_materials.kg.title")}
          onClose={() => setExpanded(false)}
          source={kgSource}
          onSourceChange={setKgSource}
          onEdit={() => setEditing(true)}
        />
      )}

      {/* Teacher-curated KG editor (CRUD + primary rule + undo/redo +
          save/publish). Launched from the detail screen's Edit button; mounts
          its own full-screen portal above it and seeds from the AI KG on first
          open. */}
      {editing && (
        <KnowledgeGraphEditor
          lessonId={lessonId}
          title={t("teacher_lesson_materials.kg.editor_title")}
          onClose={() => setEditing(false)}
        />
      )}

      {/* Publish confirmation. Publishing overwrites what students currently
          see, so the copy states that plainly and names the node count. When
          the draft isn't persisted yet the copy says so, since confirming will
          save as well as publish. */}
      <ConfirmDialog
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
        title={
          needsSaveBeforePublish
            ? t("teacher_lesson_materials.kg.save_publish_confirm_title")
            : t("teacher_lesson_materials.kg.publish_confirm_title")
        }
        description={
          curatedData?.is_published
            ? t("teacher_lesson_materials.kg.publish_confirm_replace", {
                count: curatedNodeCount,
              })
            : t("teacher_lesson_materials.kg.publish_confirm_first", {
                count: curatedNodeCount,
              })
        }
        confirmLabel={
          needsSaveBeforePublish
            ? t("teacher_lesson_materials.kg.save_and_publish")
            : t("teacher_lesson_materials.kg.publish")
        }
        cancelLabel={t("common.cancel")}
        confirmVariant="default"
        isPending={publishBusy}
        onConfirm={handlePublishCurated}
      />
    </>
  );
}
