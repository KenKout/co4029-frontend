import { Eye, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { UploadFieldProps } from "./types";

/**
 * The AI-processing and student-visibility checkboxes of the upload form.
 * Extracted verbatim from the former 1422-line material-hub.tsx.
 */
export function UploadToggleRow({
  form,
  setForm,
  uploading,
}: UploadFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-6">
      <label className="flex items-center gap-2 text-xs text-m3-on-surface cursor-pointer">
        <input
          type="checkbox"
          disabled={uploading}
          checked={form.ai_processing_enabled}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              ai_processing_enabled: e.target.checked,
            }))
          }
          className="rounded"
        />
        <Sparkles className="h-3.5 w-3.5 text-m3-secondary" />
        {t("teacher_lesson_materials.form.ai_processing")}
      </label>
      <label className="flex items-center gap-2 text-xs text-m3-on-surface cursor-pointer">
        <input
          type="checkbox"
          disabled={uploading}
          checked={form.visible_to_students}
          onChange={(e) =>
            setForm((f) => ({ ...f, visible_to_students: e.target.checked }))
          }
          className="rounded"
        />
        <Eye className="h-3.5 w-3.5" />
        {t("teacher_lesson_materials.form.visible_to_students")}
      </label>
    </div>
  );
}
