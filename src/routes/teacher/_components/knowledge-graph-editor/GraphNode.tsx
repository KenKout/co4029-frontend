import { Star } from "lucide-react";

import type { CuratedKGNode } from "@/lib/api/types";

import { radiusFor } from "./helpers";
import type { Vec } from "./types";

/**
 * Halo around a node that is selected, armed as an arrow source, or primary.
 * The ring colour ranks those states: link source wins, then primary.
 */
function NodeHighlightRing({
  r,
  isLinkSrc,
  isPrimary,
}: {
  r: number;
  isLinkSrc: boolean;
  isPrimary: boolean;
}) {
  return (
    <circle
      r={r + 7}
      fill="none"
      stroke={isLinkSrc ? "#7c3aed" : isPrimary ? "#f59e0b" : "#3b82f6"}
      strokeWidth={2.5}
      opacity={0.5}
    />
  );
}

/** One concept circle plus its truncated label, positioned in world space. */
export function GraphNode({
  node,
  p,
  isSelected,
  isLinkSrc,
  onPointerDownNode,
  onClickNode,
}: {
  node: CuratedKGNode;
  p: Vec;
  isSelected: boolean;
  isLinkSrc: boolean;
  onPointerDownNode: (e: React.PointerEvent) => void;
  onClickNode: () => void;
}) {
  const r = radiusFor(node.weight);

  return (
    <g
      transform={`translate(${p.x} ${p.y})`}
      className="cursor-pointer"
      onPointerDown={onPointerDownNode}
      onPointerUp={onClickNode}
    >
      {(isSelected || isLinkSrc || node.is_primary) && (
        <NodeHighlightRing
          r={r}
          isLinkSrc={isLinkSrc}
          isPrimary={node.is_primary}
        />
      )}
      <circle
        r={r}
        fill={node.is_primary ? "#1e40af" : "#dbeafe"}
        stroke={node.is_primary ? "#1e3a8a" : "#3b82f6"}
        strokeWidth={isSelected ? 3 : 1.5}
      />
      {node.is_primary && (
        <Star
          x={-6}
          y={-6}
          width={12}
          height={12}
          className="fill-amber-300 text-amber-300"
        />
      )}
      <text
        y={r + 14}
        textAnchor="middle"
        fontSize={13}
        fontWeight={node.is_primary ? 700 : 600}
        className="pointer-events-none fill-m3-on-surface"
      >
        {node.label.length > 28 ? `${node.label.slice(0, 27)}…` : node.label}
      </text>
    </g>
  );
}
