import { useTranslation } from "react-i18next";

import { Select } from "@/components/ui/select";
import type { MaterialUploadInit } from "@/lib/api/types";

import { MATERIAL_TYPE_OPTIONS } from "./constants";
import type { UploadFieldProps } from "./types";

/**
 * Document-type picker of the upload form. Extracted verbatim from the former
 * 1422-line material-hub.tsx.
 */
export function UploadTypeField({
  form,
  setForm,
  uploading,
}: UploadFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_lesson_materials.form.doc_type_label")}
      </label>
      <Select<NonNullable<MaterialUploadInit["material_type"]>>
        aria-label={t("teacher_lesson_materials.form.doc_type_label")}
        disabled={uploading}
        value={form.material_type ?? "pdf"}
        onValueChange={(next) =>
          setForm((f) => ({ ...f, material_type: next }))
        }
        options={MATERIAL_TYPE_OPTIONS.map((opt) => ({
          value: (opt.value ?? "pdf") as NonNullable<
            MaterialUploadInit["material_type"]
          >,
          label: opt.labelKey
            ? t(`teacher_lesson_materials.doc_type.${opt.labelKey}`)
            : opt.labelText,
        }))}
        className="bg-m3-surface-container-lowest"
      />
    </div>
  );
}
