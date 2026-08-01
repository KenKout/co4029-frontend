import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

/**
 * Shared types for the full-screen knowledge-graph explorer, extracted from the
 * former 863-line knowledge-graph-detail.tsx so the layout maths, the camera
 * helpers, the hooks and the SVG layers can agree on one definition instead of
 * re-declaring the same shapes.
 *
 * Coordinates live in an abstract "world" space; {@link Transform} maps
 * world → screen (translate + uniform scale).
 */

export interface KgVec {
  x: number;
  y: number;
}

export interface Transform {
  tx: number;
  ty: number;
  scale: number;
}

export type KgLayoutMode = "circular" | "tree";

export type KgSource = "ai" | "curated";

/** One concept node as returned by the lesson knowledge-graph endpoint. */
export type KgNodeDatum = LessonKnowledgeGraph["nodes"][number];

/** One edge as returned by the lesson knowledge-graph endpoint. */
export type KgEdgeDatum = LessonKnowledgeGraph["edges"][number];

/** id → node lookup shared by the edge layer and the relationship popup. */
export type KgNodeById = Map<string, KgNodeDatum>;

/** Neighbour buckets for the pinned concept, split by edge kind + direction. */
export interface KgPinnedRelations {
  /** Concepts that are a prerequisite OF the pinned concept. */
  prerequisites: string[];
  /** Concepts the pinned concept is a prerequisite OF. */
  unlocks: string[];
  /** RELATED_TO neighbours in either direction. */
  related: string[];
}

/** Screen-space anchor for the relationship popup over the pinned node. */
export interface KgPinnedScreen {
  x: number;
  y: number;
  r: number;
  /** True when the popup should hang below the node (node sits high up). */
  below: boolean;
}

/** Which gesture the active pointer is driving, if any. */
export type KgDragKind = "pan" | "node" | null;
