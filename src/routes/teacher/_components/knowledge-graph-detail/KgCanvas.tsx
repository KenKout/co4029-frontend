import type { RefObject } from "react";

import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

import { KgArrowDefs } from "./KgArrowDefs";
import { KgEdgeLayer } from "./KgEdgeLayer";
import { KgNodeLayer } from "./KgNodeLayer";
import type { KgDragKind, KgNodeById, KgVec, Transform } from "./types";

/**
 * The SVG canvas: plain SVG with a single <g> transform (translate+scale) — no
 * physics sim and no graph library, so it stays dependency-free and the node
 * positions never jitter between renders. Extracted verbatim from the former
 * 863-line knowledge-graph-detail.tsx.
 */
export function KgCanvas({
  svgRef,
  title,
  nodes,
  edges,
  positions,
  nodeById,
  maxW,
  minW,
  activeId,
  neighborIds,
  transform,
  smooth,
  dragKind,
  onPointerDownBackground,
  onPointerMove,
  onPointerUp,
  onPointerDownNode,
  onNodeTap,
  onNodeHoverEnter,
  onNodeHoverLeave,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  title: string;
  nodes: LessonKnowledgeGraph["nodes"];
  edges: LessonKnowledgeGraph["edges"];
  positions: Map<string, KgVec>;
  nodeById: KgNodeById;
  maxW: number;
  minW: number;
  activeId: string | null;
  neighborIds: Set<string>;
  transform: Transform;
  /** Animate the world transform (camera focus) instead of snapping. */
  smooth: boolean;
  dragKind: KgDragKind;
  onPointerDownBackground: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerDownNode: (e: React.PointerEvent, nodeId: string) => void;
  onNodeTap: (nodeId: string) => void;
  onNodeHoverEnter: (nodeId: string) => void;
  onNodeHoverLeave: () => void;
}) {
  return (
    <svg
      ref={svgRef}
      className={cn(
        "h-full w-full touch-none select-none",
        dragKind === "pan" ? "cursor-grabbing" : "cursor-grab",
      )}
      onPointerDown={onPointerDownBackground}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      role="application"
      aria-label={title}
    >
      <KgArrowDefs />

      <g
        transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}
        style={{
          transition: smooth
            ? "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)"
            : undefined,
        }}
      >
        <KgEdgeLayer
          edges={edges}
          positions={positions}
          nodeById={nodeById}
          maxW={maxW}
          minW={minW}
          activeId={activeId}
        />
        <KgNodeLayer
          nodes={nodes}
          positions={positions}
          maxW={maxW}
          minW={minW}
          activeId={activeId}
          neighborIds={neighborIds}
          onPointerDownNode={onPointerDownNode}
          onNodeTap={onNodeTap}
          onNodeHoverEnter={onNodeHoverEnter}
          onNodeHoverLeave={onNodeHoverLeave}
        />
      </g>
    </svg>
  );
}
