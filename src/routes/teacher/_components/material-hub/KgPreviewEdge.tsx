import {
  KG_EDGE_MARKER,
  KG_EDGE_STROKE,
  KG_EDGE_STROKE_WIDTH,
} from "./constants";
import type { KgPreviewEdgeDatum } from "./kg-preview-helpers";
import { kgEdgePath } from "./kg-preview-helpers";
import type { KgEdgeState, KgEdgeVariant, KgNodePosition } from "./types";

/**
 * One directed edge of the compact KG preview. Extracted verbatim from the
 * former 1422-line material-hub.tsx; the stroke / arrowhead / thickness
 * ternaries became the {@link KG_EDGE_STROKE}-family lookups, which resolve to
 * the same values.
 */
export function KgPreviewEdge({
  edge,
  a,
  b,
  hovered,
}: {
  edge: KgPreviewEdgeDatum;
  a: KgNodePosition | undefined;
  b: KgNodePosition | undefined;
  hovered: string | null;
}) {
  if (!a || !b) return null;
  const isPrereq = edge.relation === "PREREQUISITE_OF";
  const connected = hovered === edge.source || hovered === edge.target;
  const dim = hovered && !connected;
  const variant: KgEdgeVariant = isPrereq ? "prereq" : "related";
  const state: KgEdgeState = connected ? "active" : "idle";
  const path = kgEdgePath(a, b);
  return (
    <path
      d={path}
      fill="none"
      stroke={KG_EDGE_STROKE[variant][state]}
      strokeWidth={KG_EDGE_STROKE_WIDTH[variant][state]}
      strokeDasharray={isPrereq && !connected ? "4 3" : undefined}
      markerEnd={KG_EDGE_MARKER[variant][state]}
      opacity={dim ? 0.1 : connected ? 0.95 : isPrereq ? 0.7 : 0.4}
      className="transition-opacity"
    />
  );
}
