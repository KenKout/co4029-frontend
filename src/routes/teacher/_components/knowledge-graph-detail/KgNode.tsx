import { KgNodeLabel } from "./KgNodeLabel";
import type { KgVec } from "./types";

/**
 * One concept node: the disc, its focus ring, and the caption. Colour, ring and
 * stroke weight encode selection state (active > centre > neighbour > plain);
 * `dim` fades everything unrelated to the active node. Extracted verbatim from
 * the former 863-line knowledge-graph-detail.tsx.
 */
export function KgNode({
  p,
  r,
  label,
  isCenter,
  isActive,
  isNeighbor,
  dim,
  onPointerDown,
  onPointerUp,
  onMouseEnter,
  onMouseLeave,
}: {
  /** World position of the node centre. */
  p: KgVec;
  /** World radius, scaled from the concept weight. */
  r: number;
  label: string;
  /** Heaviest concept (nodes[0]) — always ringed. */
  isCenter: boolean;
  isActive: boolean;
  isNeighbor: boolean;
  dim: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <g
      transform={`translate(${p.x} ${p.y})`}
      opacity={dim ? 0.28 : 1}
      className="cursor-pointer transition-opacity"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {(isActive || isCenter) && (
        <circle
          r={r + 7}
          fill="none"
          stroke={isActive ? "#1e40af" : "#3b82f6"}
          strokeWidth={2}
          opacity={0.35}
        />
      )}
      <circle
        r={r}
        fill={
          isCenter || isActive ? "#1e40af" : isNeighbor ? "#bfdbfe" : "#dbeafe"
        }
        stroke={isActive || isCenter ? "#1e3a8a" : "#3b82f6"}
        strokeWidth={isActive ? 3 : 1.5}
      />
      <KgNodeLabel
        r={r}
        label={label}
        isCenter={isCenter}
        isActive={isActive}
      />
    </g>
  );
}
