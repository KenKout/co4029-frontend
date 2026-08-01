import { useCallback, useEffect } from "react";

import type { CuratedKGDraft } from "@/lib/api/types";

import { HISTORY_CAP, WORLD_H, WORLD_W } from "./constants";
import { seedPositions } from "./helpers";
import type { EditorState } from "./use-editor-state";
import type { Graph } from "./types";

export interface GraphHistoryActions {
  commit: (next: Graph) => void;
  undo: () => void;
  redo: () => void;
}

/**
 * Seeds the editor from the loaded draft and owns the undo/redo history stack.
 * `commit` is the single write path for every graph mutation: it pushes a new
 * snapshot, truncates any redo tail, and guarantees new nodes get a position.
 */
export function useGraphHistoryActions(options: {
  state: EditorState;
  draft: CuratedKGDraft | undefined;
}): GraphHistoryActions {
  const { state, draft } = options;
  const { hist, pos } = state;

  // Seed local state once the draft loads.
  useEffect(() => {
    if (hist.isInitialized() || !draft) return;
    hist.markInitialized();
    const g: Graph = {
      nodes: draft.nodes.map((n) => ({ ...n })),
      edges: draft.edges.map((e) => ({ ...e })),
    };
    hist.setHistory([g]);
    hist.setHistIndex(0);
    hist.setSavedSnapshot(JSON.stringify(g));
    hist.setSeededHint(draft.seeded);
    pos.setPositions(seedPositions(g.nodes));
  }, [draft]);

  // Commit a new graph state onto the history stack (truncating any redo tail).
  const commit = useCallback(
    (next: Graph) => {
      hist.setHistory((prev) => {
        const truncated = prev.slice(0, hist.histIndex + 1);
        truncated.push(next);
        // Cap history so a long session doesn't grow unbounded.
        const capped =
          truncated.length > HISTORY_CAP
            ? truncated.slice(truncated.length - HISTORY_CAP)
            : truncated;
        return capped;
      });
      hist.setHistIndex((i) => Math.min(i + 1, HISTORY_CAP - 1));
      // Ensure every node has a position (new nodes get one near centre).
      pos.setPositions((prev) => {
        const nextPos = new Map(prev);
        next.nodes.forEach((n) => {
          if (!nextPos.has(n.id)) {
            nextPos.set(n.id, {
              x: WORLD_W / 2 + (Math.random() - 0.5) * 200,
              y: WORLD_H / 2 + (Math.random() - 0.5) * 200,
            });
          }
        });
        return nextPos;
      });
    },
    [hist.histIndex],
  );

  const undo = useCallback(() => {
    hist.setHistIndex((i) => Math.max(0, i - 1));
  }, []);
  const redo = useCallback(() => {
    hist.setHistIndex((i) => Math.min(hist.history.length - 1, i + 1));
  }, [hist.history.length]);

  return { commit, undo, redo };
}
