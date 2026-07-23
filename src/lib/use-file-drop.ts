/**
 * Shared drag-and-drop file handling for any drop target.
 *
 * Encapsulates the flicker-proof drag lifecycle used by both the full
 * `FileDropzone` and the compact preview-tile pickers (avatar, course
 * thumbnail) so every upload surface behaves identically:
 *
 *  - Drag-depth counter: dragenter/dragleave fire for EVERY element the
 *    cursor crosses (the target AND its children). Counting enters minus
 *    leaves means `dragging` only clears when the cursor truly leaves the
 *    whole target — no flicker as you move over inner content.
 *  - dragover always calls preventDefault (else the browser rejects the drop
 *    and opens the file instead) and sets the copy cursor.
 *  - Exposes the dragged item's MIME during drag (the only file info the
 *    browser reveals before drop) so callers can show a type-aware logo.
 *
 * Returns `dragging`, the sniffed `dragMime`, and a `dropProps` object to
 * spread onto the drop target element.
 */
import { useCallback, useRef, useState } from "react";

export interface UseFileDropOptions {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export interface FileDropHandlers {
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export interface UseFileDropResult {
  dragging: boolean;
  /** MIME of the dragged item (available during dragover), or null. */
  dragMime: string | null;
  /** Spread onto the drop target element. */
  dropProps: FileDropHandlers;
}

export function useFileDrop({
  onFile,
  disabled,
}: UseFileDropOptions): UseFileDropResult {
  const [dragging, setDragging] = useState(false);
  const [dragMime, setDragMime] = useState<string | null>(null);
  const dragDepth = useRef(0);

  const reset = useCallback(() => {
    dragDepth.current = 0;
    setDragging(false);
    setDragMime(null);
  }, []);

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      dragDepth.current += 1;
      setDragging(true);
      const item = e.dataTransfer.items?.[0];
      const mime = item && item.kind === "file" ? item.type : null;
      setDragMime((prev) => (prev === mime ? prev : mime));
    },
    [disabled],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      // Must preventDefault every frame or the browser rejects the drop and
      // navigates to / opens the dropped file instead.
      e.preventDefault();
      if (!disabled) e.dataTransfer.dropEffect = "copy";
    },
    [disabled],
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setDragging(false);
      setDragMime(null);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      reset();
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile, disabled, reset],
  );

  return {
    dragging,
    dragMime,
    dropProps: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
