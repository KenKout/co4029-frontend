import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import { ProgressBar } from "./ProgressBar";
import type { MaterialUploadController } from "./use-material-upload";

/**
 * In-flight phase bar plus the abort button, which only appears for multipart
 * uploads (>100 MB) because those are the only ones with a cancellable
 * AbortController. Extracted verbatim from the former 1422-line
 * material-hub.tsx.
 */
export function UploadProgressPanel({
  file,
  upload,
}: {
  file: File;
  upload: MaterialUploadController;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <ProgressBar value={upload.progress} label={upload.phaseLabel} />
      {upload.phase === "uploading" && file.size > 100 * 1024 * 1024 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={upload.cancelUpload}
          className="gap-1.5 text-xs text-m3-error hover:text-m3-error hover:bg-m3-error-container/30"
        >
          <X className="h-3 w-3" />
          {t("teacher_lesson_materials.form.cancel_upload")}
        </Button>
      )}
    </div>
  );
}
