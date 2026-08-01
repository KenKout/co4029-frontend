import type { CuratedKGNode, CuratedKGRelation } from "@/lib/api/types";

import { WORLD_H, WORLD_W } from "./constants";
import type { TranslateFn, Vec } from "./types";

// Deterministic radial seed layout so a freshly loaded graph has sane
// positions. The teacher can drag from here; positions are view-only (not
// persisted) — the graph's meaning is nodes+edges, not coordinates.
export function seedPositions(nodes: CuratedKGNode[]): Map<string, Vec> {
  const positions = new Map<string, Vec>();
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  // Primary (or first) node anchors the centre.
  const primaryIdx = Math.max(
    0,
    nodes.findIndex((n) => n.is_primary),
  );
  nodes.forEach((node, i) => {
    if (i === primaryIdx) {
      positions.set(node.id, { x: cx, y: cy });
      return;
    }
    const rank = i < primaryIdx ? i + 1 : i;
    const ring = rank <= 8 ? 1 : rank <= 24 ? 2 : 3;
    const radius = ring * Math.min(WORLD_W, WORLD_H) * 0.16;
    const angle = rank * 2.399963; // golden angle
    positions.set(node.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });
  return positions;
}

export function radiusFor(weight: number): number {
  const w = Math.max(1, Math.min(100, weight));
  return 12 + Math.min(22, (w / 20) * 22);
}

let nodeSeq = 0;
export function freshNodeId() {
  nodeSeq += 1;
  return `n_${Date.now().toString(36)}_${nodeSeq}`;
}

/**
 * Trim an arrow so it starts/ends just outside the two node circles rather
 * than at their centres, and report the midpoint used for the selection dot.
 * The target side gets a wider gap (7 vs 3) to leave room for the marker head.
 */
export function edgeGeometry(a: Vec, b: Vec, ra: number, rb: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const x1 = a.x + ux * (ra + 3);
  const y1 = a.y + uy * (ra + 3);
  const x2 = b.x - ux * (rb + 7);
  const y2 = b.y - uy * (rb + 7);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return { x1, y1, x2, y2, mx, my };
}

/** Human label for an arrow kind, used by the toolbar, banner and inspector. */
export function relationLabel(t: TranslateFn, r: CuratedKGRelation) {
  return r === "PREREQUISITE_OF"
    ? t("teacher_kg_editor.rel_prerequisite")
    : t("teacher_kg_editor.rel_related");
}
