import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

import { KG_H, KG_W } from "./constants";
import { layoutKgNodes } from "./kg-layout";
import type { KgNodePosition } from "./types";

/**
 * Pure geometry + paint helpers for the compact knowledge-graph preview,
 * extracted verbatim from the former 1422-line material-hub.tsx. Kept free of
 * React so the maths reads on its own and no SVG layer owns the definition.
 */

/** One concept node as returned by the lesson knowledge-graph endpoint. */
export type KgPreviewNodeDatum = LessonKnowledgeGraph["nodes"][number];

/** One edge as returned by the lesson knowledge-graph endpoint. */
export type KgPreviewEdgeDatum = LessonKnowledgeGraph["edges"][number];

/**
 * Curved segment between two node rims. Shortened at both ends so the
 * arrowhead lands on the target's rim, not buried under the circle.
 */
export function kgEdgePath(a: KgNodePosition, b: KgNodePosition): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const x2 = b.x - ux * (b.r + 2);
  const y2 = b.y - uy * (b.r + 2);
  const x1 = a.x + ux * (a.r + 2);
  const y1 = a.y + uy * (a.r + 2);
  const nx = uy; // right-hand normal (SVG y-down): (uy, -ux)
  const ny = -ux;
  const curve = Math.min(len * 0.16, 24);
  const mx = (x1 + x2) / 2 + nx * curve;
  const my = (y1 + y2) / 2 + ny * curve;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

export function kgNodeFill(flags: {
  isCenter: boolean;
  isHovered: boolean;
  isNeighbor: boolean;
}): string {
  return flags.isCenter || flags.isHovered
    ? "#1e40af"
    : flags.isNeighbor
      ? "#bfdbfe"
      : "#dbeafe";
}

export function kgNodeStroke(flags: {
  isCenter: boolean;
  isHovered: boolean;
}): string {
  return flags.isHovered ? "#1e3a8a" : flags.isCenter ? "#1e3a8a" : "#3b82f6";
}

/** Everything the preview's SVG layers derive from the graph + hover state. */
export interface KgPreviewDerived {
  nodes: LessonKnowledgeGraph["nodes"];
  edges: LessonKnowledgeGraph["edges"];
  positions: Map<string, KgNodePosition>;
  hoveredNode: KgPreviewNodeDatum | null | undefined;
  neighborIds: Set<string>;
}

export function deriveKgPreview(
  data: LessonKnowledgeGraph | undefined,
  hovered: string | null,
): KgPreviewDerived {
  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];
  const positions =
    nodes.length > 0
      ? layoutKgNodes(nodes, KG_W, KG_H)
      : new Map<string, KgNodePosition>();
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const hoveredNode = hovered ? nodeById.get(hovered) : null;
  // Direct neighbours of the hovered node (either edge direction) — kept
  // bright while the rest dim, so the hovered concept's connections read
  // clearly.
  const neighborIds = new Set<string>();
  if (hovered) {
    for (const e of edges) {
      if (e.source === hovered) neighborIds.add(e.target);
      else if (e.target === hovered) neighborIds.add(e.source);
    }
  }
  return { nodes, edges, positions, hoveredNode, neighborIds };
}
