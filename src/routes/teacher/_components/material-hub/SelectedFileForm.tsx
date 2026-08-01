import { useState } from "react";
import { useTranslation } from "react-i18next";

import { detectMaterialType } from "./helpers";
import { SelectedFilePreview } from "./SelectedFilePreview";
import type { UploadFormState } from "./types";
import { UploadFormActions } from "./UploadFormActions";
import { UploadProgressPanel } from "./UploadProgressPanel";
import { UploadTitleField } from "./UploadTitleField";
import { UploadToggleRow } from "./UploadToggleRow";
import { UploadTypeField } from "./UploadTypeField";
import { useMaterialUpload } from "./use-material-upload";

/**
 * Metadata form for a picked file, and the submit that drives the upload.
 *
 * This is the orchestrator: form state and composition only. The six upload
 * mutations, the phase/progress/abort state and both upload paths live in
 * {@link useMaterialUpload}; every field region is its own component.
 */
export function SelectedFileForm({
  file,
  lessonId,
  courseId,
  lessonPrimaryMaterialId,
  onDone,
  onCancel,
}: {
  file: File;
  lessonId: string;
  courseId: string;
  lessonPrimaryMaterialId: string | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const upload = useMaterialUpload({
    file,
    lessonId,
    courseId,
    lessonPrimaryMaterialId,
    onDone,
    t,
  });

  const [form, setForm] = useState<UploadFormState>({
    title: file.name.replace(/\.[^.]+$/, ""),
    material_type: detectMaterialType(file),
    ai_processing_enabled: true,
    visible_to_students: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await upload.submit(form);
  }

  const fields = { form, setForm, uploading: upload.uploading };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-6 bg-m3-surface-container-low rounded-xl border border-m3-outline-variant/20"
    >
      <SelectedFilePreview file={file} materialType={form.material_type} />

      <UploadTitleField {...fields} />

      <UploadTypeField {...fields} />

      <UploadToggleRow {...fields} />

      {upload.uploading && upload.phase !== "idle" && (
        <UploadProgressPanel file={file} upload={upload} />
      )}

      <UploadFormActions uploading={upload.uploading} onCancel={onCancel} />
    </form>
  );
}
