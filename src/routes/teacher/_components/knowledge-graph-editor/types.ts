import type { useTranslation } from "react-i18next";

import type {
  useSaveCuratedKnowledgeGraph,
  usePublishCuratedKnowledgeGraph,
} from "@/lib/api/hooks/materials";
import type { CuratedKGEdge, CuratedKGNode } from "@/lib/api/types";

/**
 * Shared types for the curated knowledge-graph editor, extracted from the
 * former 1.1k-line knowledge-graph-editor.tsx so the orchestrator, the hooks
 * and the presentational components agree on one definition instead of passing
 * loosely-typed props. No behavioural surface of its own.
 */

export interface Graph {
  nodes: CuratedKGNode[];
  edges: CuratedKGEdge[];
}

export interface Vec {
  x: number;
  y: number;
}

export interface Transform {
  tx: number;
  ty: number;
  scale: number;
}

/** Source/target pair identifying one relationship in the graph. */
export interface EdgeRef {
  source: string;
  target: string;
}

/**
 * Live pointer-gesture bookkeeping. `moved` distinguishes a click from a drag
 * so releasing after a pan doesn't also select the node under the cursor.
 */
export interface DragState {
  kind: "pan" | "node" | null;
  nodeId?: string;
  lastX: number;
  lastY: number;
  moved: boolean;
}

/** `t` exactly as the orchestrator's `useTranslation()` hands it out. */
export type TranslateFn = ReturnType<typeof useTranslation>["t"];

export type SaveGraphMutation = ReturnType<typeof useSaveCuratedKnowledgeGraph>;
export type PublishGraphMutation = ReturnType<
  typeof usePublishCuratedKnowledgeGraph
>;
