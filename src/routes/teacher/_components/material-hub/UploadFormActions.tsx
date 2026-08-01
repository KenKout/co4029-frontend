import { Loader2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

/**
 * Submit + close footer of the upload form. Extracted verbatim from the former
 * 1422-line material-hub.tsx.
 */
export function UploadFormActions({
  uploading,
  onCancel,
}: {
  uploading: boolean;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2 pt-1">
      <Button
        type="submit"
        disabled={uploading}
        className="flex-1 gap-2 gradient-primary text-white border-0 shadow-ai-glow"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />{" "}
            {t("teacher_lesson_materials.form.uploading")}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />{" "}
            {t("teacher_lesson_materials.form.upload_button")}
          </>
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        disabled={uploading}
        className="px-4"
      >
        {t("common.close")}
      </Button>
    </div>
  );
}
