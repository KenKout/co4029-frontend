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
import { CloudUpload, Loader2 } from "lucide-react";
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
  /** Show an uploading spinner + label; also blocks interaction. */
  busy?: boolean;
  /** Label shown while `busy` (defaults to a generic i18n string). */
  busyLabel?: string;
}

export function FileDropzone({
  onFile,
  accept,
  disabled,
  idleTitle,
  hint,
  className,
  compact,
  busy,
  busyLabel,
}: FileDropzoneProps) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  // MIME sniffed from the drag payload (the only file info the browser
  // exposes during dragover). Drives the file-type logo while dragging.
  const [dragMime, setDragMime] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Drag-enter/leave nesting counter. dragenter/dragleave fire for EVERY
  // element the cursor crosses (root AND its children), so a naive
  // setDragging(false) on dragleave flickers wildly as you move over the
  // inner icon/text. Counting enters minus leaves means we only clear the
  // dragging state when the count returns to zero — i.e. the cursor has
  // truly left the whole dropzone, not just moved onto a child.
  const dragDepth = useRef(0);

  const resetDrag = useCallback(() => {
    dragDepth.current = 0;
    setDragging(false);
    setDragMime(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      resetDrag();
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile, disabled, resetDrag],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      dragDepth.current += 1;
      setDragging(true);
      // dataTransfer.items carries the kind/type during drag; files[] is empty
      // until drop. Read the first item's MIME to pick the logo.
      const item = e.dataTransfer.items?.[0];
      const mime = item && item.kind === "file" ? item.type : null;
      setDragMime((prev) => (prev === mime ? prev : mime));
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      // Must preventDefault on every dragover or the browser rejects the drop
      // (and navigates to / opens the file instead). Show the copy cursor.
      e.preventDefault();
      if (!disabled) e.dataTransfer.dropEffect = "copy";
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) {
        setDragging(false);
        setDragMime(null);
      }
    },
    [],
  );

  const kind = fileKind({ mime: dragMime });
  const KindIcon = kind.Icon;
  // `busy` (upload in flight) also blocks interaction, like `disabled`.
  const blocked = disabled || busy;

  return (
    <div
      role="button"
      tabIndex={blocked ? -1 : 0}
      aria-disabled={blocked}
      aria-busy={busy}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !blocked && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !blocked) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        // NOTE: no scale/transform on the drag-active state. A transform
        // resizes the hit box, and if the user releases on a frame where it
        // just resized, the drop can land outside the element → the browser
        // opens the file instead. Keep the box geometry stable; only the
        // border + background change.
        "relative cursor-pointer rounded-xl border-2 text-center transition-colors duration-200 outline-none",
        compact ? "p-5" : "p-10",
        "focus-visible:ring-2 focus-visible:ring-m3-secondary/60",
        dragging
          ? "dropzone-spin-border bg-m3-secondary-fixed/25"
          : "border-dashed border-m3-outline-variant/40 hover:border-m3-secondary hover:bg-m3-surface-container-low/60",
        blocked && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        disabled={blocked}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onFile(file);
            e.target.value = "";
          }
        }}
      />

      {busy ? (
        // Upload in flight: spinner + label, no drag/click affordance.
        // pointer-events-none on all inner content so children never become
        // drag targets (redundant with the depth counter, but it also stops
        // any stray hover/flicker at the child boundary — belt and braces).
        <div
          className={cn(
            "pointer-events-none flex items-center justify-center",
            compact ? "gap-3" : "flex-col gap-3",
          )}
        >
          <Loader2
            className={cn(
              "animate-spin text-m3-secondary",
              compact ? "h-5 w-5" : "h-8 w-8",
            )}
          />
          <p className="font-headline font-bold text-m3-on-surface text-base">
            {busyLabel ?? t("file_dropzone.uploading")}
          </p>
        </div>
      ) : dragging ? (
        // Drag-active: file-type logo (from MIME) + drop prompt. The spinning
        // ring is the border; the logo pulses to signal "release here".
        <div
          className={cn(
            "pointer-events-none flex items-center justify-center",
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
        <div className="pointer-events-none">
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
        </div>
      )}
    </div>
  );
}
