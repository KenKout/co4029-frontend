/**
 * Reusable drag-and-drop file picker.
 *
 * UX states (per teacher-upload UX request):
 *  - idle:     dashed border; hover highlights the border + tints the surface.
 *  - dragover: surface changes color, a rotating conic-gradient ring spins
 *              around the edge, and the file-type logo is drawn from the
 *              dragged item's MIME type. (Filenames are NOT exposed by the
 *              browser during dragover — only the MIME type — so we show the
 *              type logo + a "Drop to upload" prompt during drag, then the
 *              logo + filename once dropped/selected.)
 *  - selected: file-type logo + filename + size (rendered by the caller via
 *              the `selected` slot, or the built-in default below).
 *
 * Kept dependency-free of any feature layer so every upload surface
 * (lesson materials, video, avatar, CSV, …) can share one component.
 */
import { useCallback, useRef, useState } from "react";
import { CloudUpload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fileKind } from "@/lib/file-icons";
import { cn } from "@/lib/utils";

export interface FileDropzoneProps {
  onFile: (file: File) => void;
  /** HTML input `accept` string. */
  accept?: string;
  disabled?: boolean;
  /** Idle headline (defaults to a generic i18n string). */
  idleTitle?: string;
  /** Sub-line under the headline, e.g. accepted formats. */
  hint?: string;
  className?: string;
  /** Compact variant: smaller padding + single-row layout. */
  compact?: boolean;
}

export function FileDropzone({
  onFile,
  accept,
  disabled,
  idleTitle,
  hint,
  className,
  compact,
}: FileDropzoneProps) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  // MIME sniffed from the drag payload (the only file info the browser
  // exposes during dragover). Drives the file-type logo while dragging.
  const [dragMime, setDragMime] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      setDragMime(null);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile, disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      setDragging(true);
      // dataTransfer.items carries the kind/type during drag; files[] is empty
      // until drop. Read the first item's MIME to pick the logo.
      const item = e.dataTransfer.items?.[0];
      const mime = item && item.kind === "file" ? item.type : null;
      setDragMime((prev) => (prev === mime ? prev : mime));
    },
    [disabled],
  );

  const kind = fileKind({ mime: dragMime });
  const KindIcon = kind.Icon;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onDragOver={handleDragOver}
      onDragLeave={() => {
        setDragging(false);
        setDragMime(null);
      }}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        "relative cursor-pointer rounded-xl border-2 text-center transition-all duration-200 outline-none",
        compact ? "p-5" : "p-10",
        "focus-visible:ring-2 focus-visible:ring-m3-secondary/60",
        dragging
          ? "dropzone-spin-border bg-m3-secondary-fixed/25 scale-[1.01]"
          : "border-dashed border-m3-outline-variant/40 hover:border-m3-secondary hover:bg-m3-surface-container-low/60",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onFile(file);
            e.target.value = "";
          }
        }}
      />

      {dragging ? (
        // Drag-active: file-type logo (from MIME) + drop prompt. The spinning
        // ring is the border; the logo pulses to signal "release here".
        <div
          className={cn(
            "flex items-center justify-center",
            compact ? "gap-3" : "flex-col gap-3",
          )}
        >
          <div className="w-14 h-14 rounded-xl bg-m3-surface flex items-center justify-center shadow-ai-glow ai-pulse">
            <KindIcon className={cn("h-7 w-7", kind.colorClass)} />
          </div>
          <div className={compact ? "text-left" : ""}>
            <p className="font-headline font-bold text-m3-on-surface text-base">
              {t("file_dropzone.drop_active")}
            </p>
            {dragMime && kind.label !== "File" && (
              <p className="text-xs text-m3-on-surface-variant mt-0.5">
                {kind.label}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "flex items-center justify-center",
              compact ? "gap-3" : "gap-3 mb-4",
            )}
          >
            <div
              className={cn(
                "rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow",
                compact ? "w-10 h-10" : "w-14 h-14",
              )}
            >
              <CloudUpload
                className={cn("text-white", compact ? "h-5 w-5" : "h-7 w-7")}
              />
            </div>
            {compact && (
              <div className="text-left">
                <p className="font-headline font-bold text-m3-on-surface text-sm">
                  {idleTitle ?? t("file_dropzone.idle_title")}
                </p>
                {hint && (
                  <p className="text-xs text-m3-on-surface-variant">{hint}</p>
                )}
              </div>
            )}
          </div>
          {!compact && (
            <>
              <p className="font-headline font-bold text-m3-on-surface text-base mb-1">
                {idleTitle ?? t("file_dropzone.idle_title")}
              </p>
              {hint && (
                <p className="text-sm text-m3-on-surface-variant">{hint}</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
