import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Row under the video surface: the estimated-duration hint (when set) and the
 * Upload / Replace Video button.
 */
export function VideoUploadRow({
  estimatedMinutes,
  streamUrl,
  uploading,
  onPickFile,
}: {
  estimatedMinutes: string;
  streamUrl?: string;
  uploading?: boolean;
  /** Opens the hidden file input owned by the parent. */
  onPickFile: () => void;
}) {
  return (
    <div className="flex justify-between items-center">
      {estimatedMinutes && (
        <span className="text-xs text-m3-on-surface-variant font-medium">
          <span className="font-bold text-m3-on-surface">
            {estimatedMinutes}
          </span>{" "}
          min estimated
        </span>
      )}
      <Button variant="ghost"
        type="button"
        disabled={uploading}
        onClick={onPickFile}
        className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-m3-outline-variant/30 bg-m3-surface hover:bg-m3-surface-container transition-colors cursor-pointer disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {uploading
          ? "Uploading…"
          : streamUrl
            ? "Replace Video"
            : "Upload Video"}
      </Button>
    </div>
  );
}
