import type { CuratedKGEdge } from "@/lib/api/types";

import { edgeGeometry, radiusFor } from "./helpers";
import type { Vec } from "./types";

/**
 * One relationship arrow, trimmed to sit between the two node circles. The
 * drawn line is only ~1.5px wide, so an invisible fat line carries the hit
 * testing.
 */
export function GraphEdge({
  edge,
  a,
  b,
  sourceWeight,
  targetWeight,
  isEdgeSelected,
  onSelect,
}: {
  edge: CuratedKGEdge;
  a: Vec;
  b: Vec;
  sourceWeight: number;
  targetWeight: number;
  isEdgeSelected: boolean;
  onSelect: () => void;
}) {
  const isPrereq = edge.relation === "PREREQUISITE_OF";
  const ra = radiusFor(sourceWeight);
  const rb = radiusFor(targetWeight);
  const { x1, y1, x2, y2, mx, my } = edgeGeometry(a, b, ra, rb);

  return (
    <g>
      {/* Invisible fat hit-line: the drawn arrow is only ~1.5px,
          far too thin to click reliably when zoomed out. */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth={14}
        className="cursor-pointer"
        onPointerDown={(ev) => ev.stopPropagation()}
        onPointerUp={(ev) => {
          ev.stopPropagation();
          onSelect();
        }}
      />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isEdgeSelected ? "#7c3aed" : isPrereq ? "#d97706" : "#94a3b8"}
        strokeWidth={isEdgeSelected ? 3 : 1.5}
        strokeDasharray={isPrereq ? "6 4" : undefined}
        markerEnd={
          isEdgeSelected
            ? "url(#kge-arrow-selected)"
            : isPrereq
              ? "url(#kge-arrow-prereq)"
              : "url(#kge-arrow-related)"
        }
        className="pointer-events-none"
      />
      {isEdgeSelected && (
        <circle
          cx={mx}
          cy={my}
          r={4}
          fill="#7c3aed"
          className="pointer-events-none"
        />
      )}
    </g>
  );
}
