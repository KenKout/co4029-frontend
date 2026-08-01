import { toast } from "sonner";
import type { TFunction } from "i18next";
import { aiDefaultForFile } from "./constants";
import { materialTypeForFile, resourceTypeForExt } from "./helpers";
import type { LessonEditorState, LessonManageData } from "./types";

/**
 * Downloadable-resource upload: request an upload slot, PUT the bytes when the
 * slot is a presigned URL, register the resource row, then — only when the
 * teacher left "Use for AI" on AND the file type carries teachable text — mirror
 * it into the AI Material Hub and claim the lesson's primary-material slot.
 *
 * Plain closures — no hooks of its own, so it does not shift the page's hook
 * order.
 */
export function useLessonResourceUpload({
  t,
  data,
  editor,
  showFeedback,
  claimPrimaryIfEmpty,
}: {
  t: TFunction;
  data: LessonManageData;
  editor: LessonEditorState;
  showFeedback: (msg: string) => void;
  claimPrimaryIfEmpty: (materialId: string) => void;
}) {
  const { lesson, resources, requestUpload, createResource, createMaterial } =
    data;

  // Opt-in: only sync to the AI Material Hub (and kick off ingestion) when
  // the teacher left the "Use for AI" toggle on. Skipping it avoids wasted
  // LLM spend + KG pollution for files with no teachable text (zip/video/…).
  async function syncResourceToAiHub(
    file: File,
    ext: string,
    storageObjectId: string,
  ) {
    try {
      const material = await createMaterial.mutateAsync({
        title: file.name.replace(/\.[^.]+$/, ""),
        material_type: materialTypeForFile(file, ext),
        storage_object_id: storageObjectId,
        // Kick off ingestion so the document gets a viewable rendition
        // instead of sitting "pending" forever with only a raw download.
        ai_processing_enabled: true,
        visible_to_students: false,
      });
      // Wire this material as the lesson's primary if the slot is empty.
      // The student reading pane renders ONLY `lesson.primary_material_id`;
      // without this the doc is uploaded + visible but the student page
      // shows nothing (the exact "live preview not working" bug). Only
      // claim an empty slot — never stomp a primary the teacher chose.
      if (material?.id) claimPrimaryIfEmpty(material.id);
    } catch {
      toast.error(t("teacher_lesson_manage.toasts.attach_sync_failed"));
    }
  }

  async function handleResourceFile(file: File) {
    if (!file) return;
    // Effective AI decision for THIS upload: the checkbox is the master switch
    // (teacher's preference); when it's on we still apply the per-file-type
    // smart default, so a ZIP/video/image won't be force-fed to the AI even
    // with the box checked (no teachable text → wasted spend + KG noise).
    const useAi = editor.aiEnabled && aiDefaultForFile(file);
    editor.setAttachingResource(true);
    try {
      const { storage_object, upload_url } = await requestUpload.mutateAsync({
        original_filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });
      if (upload_url && !upload_url.startsWith("s3://")) {
        await fetch(upload_url, { method: "PUT", body: file });
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      await createResource.mutateAsync({
        title: file.name,
        resource_type: resourceTypeForExt(ext),
        storage_object_id: storage_object.id,
        position: resources.length + 1,
      });
      showFeedback(`"${file.name}" attached successfully.`);

      const currentModuleId = lesson?.module_id;
      if (useAi && currentModuleId) {
        await syncResourceToAiHub(file, ext, storage_object.id);
      }
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_lesson_manage.toasts.attach_failed"),
      );
    } finally {
      editor.setAttachingResource(false);
    }
  }

  return { handleResourceFile };
}
