import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

import { WORLD_H, WORLD_W } from "./constants";
import { layoutTree } from "./tree-layout";
import type { KgLayoutMode, KgVec } from "./types";

/**
 * Pure layout + edge-geometry helpers for the knowledge-graph explorer,
 * extracted verbatim from the former 863-line knowledge-graph-detail.tsx. Kept
 * free of React so the maths can be reasoned about (and unit-tested) on its own
 * and so no component owns the definition.
 */

/**
 * Deterministic radial layout in world space: heaviest concept at the centre,
 * the rest fanned out on rings by rank with golden-angle spacing so neighbours
 * never stack. Pure function of the node list, so positions are stable across
 * renders (the drag layer mutates a copy in state).
 */
function layoutCircular(
  nodes: LessonKnowledgeGraph["nodes"],
): Map<string, KgVec> {
  const positions = new Map<string, KgVec>();
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  nodes.forEach((node, i) => {
    if (i === 0) {
      positions.set(node.id, { x: cx, y: cy });
      return;
    }
    // Three rings so a 60-node graph doesn't crowd a single band.
    const ring = i <= 8 ? 1 : i <= 24 ? 2 : 3;
    const radius = ring * Math.min(WORLD_W, WORLD_H) * 0.16;
    const angle = i * 2.399963; // golden angle (radians)
    positions.set(node.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });
  return positions;
}

export function computeLayout(
  mode: KgLayoutMode,
  nodes: LessonKnowledgeGraph["nodes"],
  edges: LessonKnowledgeGraph["edges"],
): Map<string, KgVec> {
  return mode === "tree" ? layoutTree(nodes, edges) : layoutCircular(nodes);
}

export function radiusFor(weight: number, maxW: number, minW: number): number {
  if (maxW === minW) return 16;
  const t = (weight - minW) / (maxW - minW);
  return 12 + t * 22; // 12–34px in world units
}

/**
 * Quadratic-curve path between two node centres, trimmed to each node's rim so
 * the arrow head lands on the circle rather than the middle of the disc. The
 * perpendicular offset (`curve`) bows the link so reciprocal pairs don't
 * overlap into a single line.
 */
export function edgePath(options: {
  a: KgVec;
  b: KgVec;
  /** World radius of the source node. */
  ra: number;
  /** World radius of the target node. */
  rb: number;
}): string {
  const { a, b, ra, rb } = options;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const x1 = a.x + ux * (ra + 3);
  const y1 = a.y + uy * (ra + 3);
  const x2 = b.x - ux * (rb + 5);
  const y2 = b.y - uy * (rb + 5);
  const nx = uy;
  const ny = -ux;
  const curve = Math.min(len * 0.16, 60);
  const mx = (x1 + x2) / 2 + nx * curve;
  const my = (y1 + y2) / 2 + ny * curve;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

export interface KgEdgeVisual {
  stroke: string;
  strokeWidth: number;
  strokeDasharray: string | undefined;
  markerEnd: string;
  opacity: number;
}

/**
 * Stroke / dash / marker / opacity for one link. Prerequisites are amber and
 * dashed, related links are slate and solid; whatever touches the active node
 * is thickened and brought to full opacity while everything else is dimmed.
 */
export function edgeVisual(options: {
  isPrereq: boolean;
  connected: boolean;
  dim: boolean;
}): KgEdgeVisual {
  const { isPrereq, connected, dim } = options;
  return {
    stroke: isPrereq ? "#d97706" : "#94a3b8",
    strokeWidth: connected ? 2.4 : isPrereq ? 1.6 : 1.2,
    strokeDasharray: isPrereq && !connected ? "6 4" : undefined,
    markerEnd: isPrereq ? "url(#kgd-arrow-prereq)" : "url(#kgd-arrow-related)",
    opacity: dim ? 0.08 : connected ? 0.95 : isPrereq ? 0.55 : 0.32,
  };
}
