import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

import { KgNode } from "./KgNode";
import { radiusFor } from "./helpers";
import type { KgVec } from "./types";

/**
 * The node pass of the world <g>. Resolves each concept's laid-out position and
 * its highlight state relative to the active node, then hands the drawing to
 * {@link KgNode}. Nodes with no position (never laid out) are skipped, exactly
 * as before.
 */
export function KgNodeLayer({
  nodes,
  positions,
  maxW,
  minW,
  activeId,
  neighborIds,
  onPointerDownNode,
  onNodeTap,
  onNodeHoverEnter,
  onNodeHoverLeave,
}: {
  nodes: LessonKnowledgeGraph["nodes"];
  positions: Map<string, KgVec>;
  maxW: number;
  minW: number;
  activeId: string | null;
  neighborIds: Set<string>;
  onPointerDownNode: (e: React.PointerEvent, nodeId: string) => void;
  onNodeTap: (nodeId: string) => void;
  onNodeHoverEnter: (nodeId: string) => void;
  onNodeHoverLeave: () => void;
}) {
  return (
    <>
      {nodes.map((n, i) => {
        const p = positions.get(n.id);
        if (!p) return null;
        const isActive = activeId === n.id;
        const isNeighbor = !!activeId && !isActive && neighborIds.has(n.id);
        const dim = !!activeId && !isActive && !isNeighbor;
        return (
          <KgNode
            key={n.id}
            p={p}
            r={radiusFor(n.weight, maxW, minW)}
            label={n.label}
            isCenter={i === 0}
            isActive={isActive}
            isNeighbor={isNeighbor}
            dim={dim}
            onPointerDown={(e) => onPointerDownNode(e, n.id)}
            onPointerUp={() => onNodeTap(n.id)}
            onMouseEnter={() => onNodeHoverEnter(n.id)}
            onMouseLeave={onNodeHoverLeave}
          />
        );
      })}
    </>
  );
}
