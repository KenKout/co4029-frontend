import { toast } from "sonner";
import type { TFunction } from "i18next";
import type { LessonEditorState, LessonManageData } from "./types";

/**
 * Primary-video upload for a video-type lesson: request a single-shot upload
 * slot, PUT the bytes to storage, hash them for the completion call, then point
 * the lesson's `primary_material_id` at the new material.
 *
 * Plain closures — no hooks of its own, so it does not shift the page's hook
 * order.
 */
export function useLessonVideoUpload({
  t,
  data,
  editor,
}: {
  t: TFunction;
  data: LessonManageData;
  editor: LessonEditorState;
}) {
  const { updateLesson, initVideoUpload, completeVideoUpload } = data;

  async function handleVideoUpload(file: File) {
    if (editor.uploadingVideo) return;
    editor.setUploadingVideo(true);
    try {
      const contentType = file.type || "video/mp4";
      const init = await initVideoUpload.mutateAsync({
        filename: file.name,
        content_type: contentType,
        size_bytes: file.size,
        title: file.name.replace(/\.[^.]+$/, ""),
        material_type: "video",
      });
      if (init.mode !== "single" || !init.upload_url) {
        toast.error(t("teacher_common.video_too_large"));
        return;
      }
      const buf = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buf);
      const checksum = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const putRes = await fetch(init.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!putRes.ok) {
        throw new Error(`S3 PUT failed: ${putRes.status}`);
      }
      await completeVideoUpload.mutateAsync({
        materialId: init.material_id,
        versionId: init.version_id,
        payload: {
          storage_object_id: init.storage_object_id,
          checksum_sha256: checksum,
        },
      });
      await updateLesson.mutateAsync({ primary_material_id: init.material_id });
      toast.success(t("teacher_common.video_uploaded"));
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        toast.error(t("teacher_common.storage_unavailable"));
      } else {
        toast.error(
          (err as Error).message || t("teacher_common.upload_failed"),
        );
      }
    } finally {
      editor.setUploadingVideo(false);
    }
  }

  return { handleVideoUpload };
}
