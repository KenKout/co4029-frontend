import { useMemo } from "react";

import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

import type { KgNodeById } from "./types";

/**
 * Read-only projections of the knowledge-graph payload, extracted from the
 * former 863-line knowledge-graph-detail.tsx. Pure `useMemo` derivations with
 * the same dependency arrays, so each recomputes at exactly the same times as
 * before.
 */
export interface KgGraphData {
  nodes: LessonKnowledgeGraph["nodes"];
  edges: LessonKnowledgeGraph["edges"];
  nodeById: KgNodeById;
  /** Heaviest node weight (floored at 1) — drives the node radius scale. */
  maxW: number;
  /** Lightest node weight (floored at 1) — drives the node radius scale. */
  minW: number;
}

export function useKgGraphData(data: LessonKnowledgeGraph): KgGraphData {
  const nodes = useMemo(() => data.nodes ?? [], [data.nodes]);
  const edges = useMemo(() => data.edges ?? [], [data.edges]);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const maxW = useMemo(
    () => Math.max(...nodes.map((n) => n.weight), 1),
    [nodes],
  );
  const minW = useMemo(
    () => Math.min(...nodes.map((n) => n.weight), 1),
    [nodes],
  );

  return { nodes, edges, nodeById, maxW, minW };
}
