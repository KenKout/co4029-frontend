import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

import type { KgNodePosition } from "./types";

// Deterministic radial layout for the KG preview: the most-central concept
// (highest weight, index 0) sits at the centre, the rest fan out on rings by
// rank. No physics sim, no new deps — stable positions that don't jitter
// between renders, and legible for the bounded top-N node set.
export function layoutKgNodes(
  nodes: LessonKnowledgeGraph["nodes"],
  width: number,
  height: number,
): Map<string, KgNodePosition> {
  const positions = new Map<string, KgNodePosition>();
  const cx = width / 2;
  const cy = height / 2;
  const maxW = Math.max(...nodes.map((n) => n.weight), 1);
  const minW = Math.min(...nodes.map((n) => n.weight), 1);
  const radiusFor = (w: number) => {
    // 7–18px by relative weight.
    const t = maxW === minW ? 1 : (w - minW) / (maxW - minW);
    return 7 + t * 11;
  };

  nodes.forEach((node, i) => {
    if (i === 0) {
      positions.set(node.id, { x: cx, y: cy, r: radiusFor(node.weight) });
      return;
    }
    // Two rings: nodes 1..8 inner, rest outer. Golden-angle spacing so
    // neighbours don't stack even at high counts.
    const isInner = i <= 8;
    const ring = isInner
      ? Math.min(width, height) * 0.26
      : Math.min(width, height) * 0.42;
    const angle = i * 2.399963; // golden angle (radians)
    positions.set(node.id, {
      x: cx + ring * Math.cos(angle),
      y: cy + ring * Math.sin(angle),
      r: radiusFor(node.weight),
    });
  });
  return positions;
}
