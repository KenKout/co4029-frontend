import type { Dispatch, RefObject, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";

import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

import { computeLayout } from "./helpers";
import type { KgLayoutMode, KgVec } from "./types";

/**
 * Layout-mode + world-position state for the knowledge-graph explorer,
 * extracted from the former 863-line knowledge-graph-detail.tsx. Same hook
 * order and same effect dependencies as the inline version.
 */
export interface KgLayoutState {
  layoutMode: KgLayoutMode;
  setLayoutMode: Dispatch<SetStateAction<KgLayoutMode>>;
  positions: Map<string, KgVec>;
  setPositions: Dispatch<SetStateAction<Map<string, KgVec>>>;
  /**
   * Mirror of the latest positions so focusNode (called from event handlers
   * and relation-chip jumps) can read current coords without going stale.
   */
  positionsRef: RefObject<Map<string, KgVec>>;
}

export function useKgLayout(
  nodes: LessonKnowledgeGraph["nodes"],
  edges: LessonKnowledgeGraph["edges"],
): KgLayoutState {
  // Layout mode: circular (radial rings) or tree (prereq hierarchy). Toggling
  // re-seeds positions from the chosen layout.
  const [layoutMode, setLayoutMode] = useState<KgLayoutMode>("circular");

  // World-space node positions. Seeded from the chosen layout, then mutated in
  // place when a teacher drags a node.
  const [positions, setPositions] = useState<Map<string, KgVec>>(() =>
    computeLayout("circular", nodes, edges),
  );
  useEffect(() => {
    setPositions(computeLayout(layoutMode, nodes, edges));
  }, [nodes, edges, layoutMode]);

  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  return { layoutMode, setLayoutMode, positions, setPositions, positionsRef };
}
