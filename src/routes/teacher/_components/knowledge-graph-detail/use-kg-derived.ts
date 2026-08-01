import type { RefObject } from "react";
import { useMemo } from "react";

import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

import { radiusFor } from "./helpers";
import type {
  KgNodeById,
  KgPinnedRelations,
  KgPinnedScreen,
  KgVec,
  Transform,
} from "./types";

/**
 * Selection-derived projections for the knowledge-graph explorer, extracted from
 * the former 863-line knowledge-graph-detail.tsx. Three `useMemo`s with the same
 * dependency arrays, in the same order, so each recomputes exactly when it did
 * before.
 */
export interface KgDerived {
  pinnedRelations: KgPinnedRelations | null;
  /** Pinned takes priority over hover when deciding what to highlight. */
  activeId: string | null;
  neighborIds: Set<string>;
  pinnedScreen: KgPinnedScreen | null;
}

export function useKgDerived(options: {
  pinned: string | null;
  hovered: string | null;
  edges: LessonKnowledgeGraph["edges"];
  positions: Map<string, KgVec>;
  transform: Transform;
  nodeById: KgNodeById;
  maxW: number;
  minW: number;
  svgRef: RefObject<SVGSVGElement | null>;
}): KgDerived {
  const {
    pinned,
    hovered,
    edges,
    positions,
    transform,
    nodeById,
    maxW,
    minW,
    svgRef,
  } = options;

  // --- Relationship data for the pinned node -------------------------------
  const pinnedRelations = useMemo(() => {
    if (!pinned) return null;
    const prerequisites: string[] = []; // concepts that are prereq OF pinned
    const unlocks: string[] = []; // concepts pinned is prereq OF
    const related: string[] = [];
    for (const e of edges) {
      if (e.relation === "PREREQUISITE_OF") {
        if (e.target === pinned) prerequisites.push(e.source);
        else if (e.source === pinned) unlocks.push(e.target);
      } else {
        if (e.source === pinned) related.push(e.target);
        else if (e.target === pinned) related.push(e.source);
      }
    }
    return { prerequisites, unlocks, related };
  }, [pinned, edges]);

  // Neighbours of the currently-active node (pinned takes priority over hover)
  // so we can highlight its immediate connections and dim the rest.
  const activeId = pinned ?? hovered;
  const neighborIds = useMemo(() => {
    const set = new Set<string>();
    if (!activeId) return set;
    for (const e of edges) {
      if (e.source === activeId) set.add(e.target);
      else if (e.target === activeId) set.add(e.source);
    }
    return set;
  }, [activeId, edges]);

  // Screen-space position of the pinned node, so the relationship popup can be
  // anchored directly over that node (not parked in a fixed corner). Derived
  // from transform + world position, so it tracks live as the user pans/zooms.
  // Reads the svg box during render — safe because the panel only mounts once
  // a node is pinned (post-mount). Also decides above/below placement so the
  // popup never spills off the top edge when the node sits high in the canvas.
  const pinnedScreen = useMemo(() => {
    if (!pinned) return null;
    const p = positions.get(pinned);
    const svg = svgRef.current;
    if (!p || !svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = p.x * transform.scale + transform.tx;
    const y = p.y * transform.scale + transform.ty;
    const r =
      radiusFor(nodeById.get(pinned)?.weight ?? minW, maxW, minW) *
      transform.scale;
    // Clamp the horizontal anchor so a centred (translateX(-50%)) 384px panel
    // stays fully on-canvas even when the node is near an edge.
    const half = 200;
    const clampedX = Math.min(Math.max(x, half), rect.width - half);
    // Prefer above; flip below when the node is in the top third.
    const below = y < rect.height * 0.34;
    return { x: clampedX, y, r, below };
  }, [pinned, positions, transform, nodeById, maxW, minW]);

  return { pinnedRelations, activeId, neighborIds, pinnedScreen };
}
