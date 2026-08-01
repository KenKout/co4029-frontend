import type { TFunction } from "i18next";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  useAbortMultipartUpload,
  useCompleteMaterialUpload,
  useCompleteMultipartUpload,
  useFetchMultipartParts,
  useInitMaterialUpload,
} from "@/lib/api/hooks/materials";
import { useUpdateLesson } from "@/lib/api/hooks/teacher-courses";

import type { UploadFormState, UploadPhase } from "./types";
import { createUploadRunners } from "./upload-runners";

/**
 * The whole upload cluster of {@link SelectedFileForm}, extracted verbatim from
 * the former 1422-line material-hub.tsx: the six upload mutations, the phase /
 * progress / abort state, and the best-effort primary-material link. The two
 * upload paths themselves live in `./upload-runners`.
 *
 * Hook call order is preserved EXACTLY as it was inline: init → complete →
 * updateLesson → fetchParts → completeMultipart → abortMultipart → uploading →
 * phase → progress → abortRef. `t` is passed in (rather than pulled from
 * useTranslation here) so the caller's hook order is untouched too.
 */
export interface MaterialUploadController {
  uploading: boolean;
  phase: UploadPhase;
  progress: number;
  /** Localised caption for the current phase; empty while idle. */
  phaseLabel: string;
  submit: (form: UploadFormState) => Promise<void>;
  cancelUpload: () => void;
}

export function useMaterialUpload(options: {
  file: File;
  lessonId: string;
  courseId: string;
  lessonPrimaryMaterialId: string | null;
  onDone: () => void;
  t: TFunction;
}): MaterialUploadController {
  const { file, lessonId, courseId, lessonPrimaryMaterialId, onDone, t } =
    options;

  const initUpload = useInitMaterialUpload(lessonId);
  const completeUpload = useCompleteMaterialUpload();
  const updateLesson = useUpdateLesson(lessonId, courseId);
  const fetchParts = useFetchMultipartParts();
  const completeMultipart = useCompleteMultipartUpload();
  const abortMultipart = useAbortMultipartUpload();

  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const { runSingleUpload, runMultipartUpload } = createUploadRunners({
    file,
    t,
    setPhase,
    setProgress,
    abortRef,
    completeUpload,
    fetchParts,
    completeMultipart,
    abortMultipart,
  });

  async function submit(form: UploadFormState) {
    setUploading(true);
    setPhase("init");
    setProgress(0);

    const contentType = file.type || "application/octet-stream";
    try {
      const init = await initUpload.mutateAsync({
        filename: file.name,
        content_type: contentType,
        size_bytes: file.size,
        title: form.title.trim(),
        material_type: form.material_type,
      });

      if (init.mode === "single") {
        await runSingleUpload(init, contentType);
      } else {
        await runMultipartUpload(init);
      }

      // Wire this material as the lesson's primary so the student reading
      // pane has something to render. Without this, an AI-Hub upload lands
      // fine but leaves lessons.primary_material_id NULL, so the learner
      // page shows nothing (or a download-only fallback). Only claim the
      // slot when it's empty — don't stomp an existing primary the teacher
      // already chose. Best-effort: a failure here shouldn't fail the
      // upload the teacher just completed successfully.
      if (!lessonPrimaryMaterialId) {
        try {
          await updateLesson.mutateAsync({
            primary_material_id: init.material_id,
          });
        } catch {
          /* non-fatal — material uploaded; primary link can be set later */
        }
      }

      toast.success(t("teacher_lesson_materials.toasts.upload_complete"));
      onDone();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("teacher_lesson_materials.toasts.upload_failed");
      toast.error(msg);
    } finally {
      setUploading(false);
      setPhase("idle");
      setProgress(0);
    }
  }

  function handleCancelUpload() {
    abortRef.current?.abort();
  }

  const phaseLabel =
    phase === "init"
      ? t("teacher_lesson_materials.phase.init")
      : phase === "hashing"
        ? t("teacher_lesson_materials.phase.hashing")
        : phase === "uploading"
          ? t("teacher_lesson_materials.phase.uploading")
          : phase === "completing"
            ? t("teacher_lesson_materials.phase.completing")
            : "";

  return {
    uploading,
    phase,
    progress,
    phaseLabel,
    submit,
    cancelUpload: handleCancelUpload,
  };
}
