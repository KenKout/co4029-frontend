import { useEffect } from "react";

import type { EditorState, SelectionState } from "./use-editor-state";

/**
 * Escape unwinds one interaction layer at a time: pending arrow source → arrow
 * mode → selected edge → selected node → close the editor.
 */
function unwindEscape(sel: SelectionState, requestClose: () => void) {
  if (sel.linkSource) sel.setLinkSource(null);
  else if (sel.arrowMode) sel.setArrowMode(false);
  else if (sel.selectedEdge) sel.setSelectedEdge(null);
  else if (sel.selectedId) sel.setSelectedId(null);
  else requestClose();
}

/** Window-level undo / redo / escape shortcuts for the full-screen editor. */
export function useEditorKeyboard(options: {
  state: EditorState;
  undo: () => void;
  redo: () => void;
  requestClose: () => void;
}): void {
  const { state, undo, redo, requestClose } = options;
  const { sel } = state;
  const { linkSource, arrowMode, selectedEdge, selectedId } = sel;

  // --- Keyboard: undo/redo/escape ------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        mod &&
        (e.key.toLowerCase() === "y" ||
          (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      } else if (e.key === "Escape") {
        unwindEscape(sel, requestClose);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    undo,
    redo,
    requestClose,
    linkSource,
    arrowMode,
    selectedEdge,
    selectedId,
  ]);
}
