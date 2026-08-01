import { edgePath, edgeVisual } from "./helpers";
import type { KgVec } from "./types";

/**
 * One link between two concepts, drawn as a bowed quadratic curve trimmed to
 * each node's rim. Geometry and stroke/opacity live in `helpers.ts` so this stays
 * a straight mapping onto the same `<path>` the former 863-line
 * knowledge-graph-detail.tsx rendered.
 */
export function KgEdge({
  a,
  b,
  ra,
  rb,
  isPrereq,
  connected,
  dim,
}: {
  a: KgVec;
  b: KgVec;
  /** World radius of the source node. */
  ra: number;
  /** World radius of the target node. */
  rb: number;
  isPrereq: boolean;
  /** True when this link touches the active (pinned or hovered) node. */
  connected: boolean;
  dim: boolean;
}) {
  const visual = edgeVisual({ isPrereq, connected, dim });
  return (
    <path
      d={edgePath({ a, b, ra, rb })}
      fill="none"
      stroke={visual.stroke}
      strokeWidth={visual.strokeWidth}
      strokeDasharray={visual.strokeDasharray}
      markerEnd={visual.markerEnd}
      opacity={visual.opacity}
      className="transition-opacity"
    />
  );
}
