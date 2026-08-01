import type { CuratedKGRelation } from "@/lib/api/types";

export const WORLD_W = 1600;
export const WORLD_H = 1000;
// Zoom bounds mirror knowledge-graph-detail.tsx so both screens feel identical.
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 3;
export const HISTORY_CAP = 100;

// Node-type vocabulary offered by the type selector. A closed list keeps the
// graph consistent — free text produced "concept"/"Concept"/"Concepts" as three
// distinct kinds. The backend column is a plain string, so extending this list
// needs no migration, and an unrecognised legacy value falls back to the first
// entry in the picker rather than being silently dropped.
export const NODE_TYPES = [
  "Concept",
  "Definition",
  "Theorem",
  "Formula",
  "Procedure",
  "Example",
  "Application",
  "Tool",
  "Person",
  "Event",
] as const;

export const RELATION_KINDS: readonly CuratedKGRelation[] = [
  "PREREQUISITE_OF",
  "RELATED_TO",
];
