import { useTranslation } from "react-i18next";

import type { UploadFieldProps } from "./types";
import { Input } from "@/components/ui/input";

/**
 * Title input of the upload form. Extracted verbatim from the former 1422-line
 * material-hub.tsx.
 */
export function UploadTitleField({
  form,
  setForm,
  uploading,
}: UploadFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_lesson_materials.form.title_label")}
      </label>
      <Input
        required
        disabled={uploading}
        className="border-m3-outline-variant/20 bg-m3-surface-container-lowest"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
      />
    </div>
  );
}
