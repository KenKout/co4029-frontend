import { FileCode, FileText, Video } from "lucide-react";

import { formatBytes } from "./helpers";
import type { UploadFormState } from "./types";

/**
 * Header row of the upload form: type glyph, filename and size. Extracted
 * verbatim from the former 1422-line material-hub.tsx.
 */
export function SelectedFilePreview({
  file,
  materialType,
}: {
  file: File;
  materialType: UploadFormState["material_type"];
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-m3-surface-container rounded-xl">
      <div className="w-9 h-9 rounded-xl bg-m3-primary-fixed flex items-center justify-center shrink-0">
        {materialType === "video" ? (
          <Video className="h-4 w-4 text-m3-primary" />
        ) : materialType === "code" ? (
          <FileCode className="h-4 w-4 text-m3-primary" />
        ) : (
          <FileText className="h-4 w-4 text-m3-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-m3-on-surface truncate">
          {file.name}
        </p>
        <p className="text-xs text-m3-on-surface-variant">
          {formatBytes(file.size)}
        </p>
      </div>
    </div>
  );
}
