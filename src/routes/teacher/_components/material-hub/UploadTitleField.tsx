import { useTranslation } from "react-i18next";

import type { UploadFieldProps } from "./types";

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
      <input
        required
        disabled={uploading}
        className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30 disabled:opacity-60"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
      />
    </div>
  );
}
