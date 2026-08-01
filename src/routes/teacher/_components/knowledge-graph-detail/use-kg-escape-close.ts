import { useEffect } from "react";

/**
 * Escape closes the explorer — unless a concept panel is pinned, in which case
 * the first Escape just clears the selection. Extracted verbatim (including the
 * `[onClose, pinned]` dependency array) from the former 863-line
 * knowledge-graph-detail.tsx.
 */
export function useKgEscapeClose(options: {
  onClose: () => void;
  pinned: string | null;
  setPinned: (next: string | null) => void;
}): void {
  const { onClose, pinned, setPinned } = options;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pinned) setPinned(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pinned]);
}
