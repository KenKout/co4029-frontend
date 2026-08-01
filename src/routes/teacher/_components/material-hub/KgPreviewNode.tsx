import type { Dispatch, SetStateAction } from "react";

import type { KgPreviewNodeDatum } from "./kg-preview-helpers";
import { kgNodeFill, kgNodeStroke } from "./kg-preview-helpers";
import { KgPreviewNodeLabel } from "./KgPreviewNodeLabel";
import type { KgNodePosition } from "./types";

/**
 * One concept node of the compact KG preview: hover halo, disc and caption.
 * Extracted verbatim from the former 1422-line material-hub.tsx; the fill and
 * stroke ternaries moved to {@link kgNodeFill} / {@link kgNodeStroke} unchanged.
 */
export function KgPreviewNode({
  node,
  index,
  p,
  hovered,
  neighborIds,
  setHovered,
}: {
  node: KgPreviewNodeDatum;
  index: number;
  p: KgNodePosition | undefined;
  hovered: string | null;
  neighborIds: Set<string>;
  setHovered: Dispatch<SetStateAction<string | null>>;
}) {
  if (!p) return null;
  const isCenter = index === 0;
  const isHovered = hovered === node.id;
  const isNeighbor = !!hovered && !isHovered && neighborIds.has(node.id);
  const dim = !!hovered && !isHovered && !isNeighbor;
  return (
    <g
      onMouseEnter={() => setHovered(node.id)}
      onMouseLeave={() => setHovered(null)}
      className="cursor-pointer transition-opacity"
      opacity={dim ? 0.25 : 1}
    >
      {/* Halo behind the hovered node so it stands out clearly. */}
      {isHovered && (
        <circle
          cx={p.x}
          cy={p.y}
          r={p.r + 5}
          fill="none"
          stroke="#1e40af"
          strokeWidth={2}
          opacity={0.35}
        />
      )}
      <circle
        cx={p.x}
        cy={p.y}
        r={p.r}
        fill={kgNodeFill({ isCenter, isHovered, isNeighbor })}
        stroke={kgNodeStroke({ isCenter, isHovered })}
        strokeWidth={isHovered ? 2.5 : 1.5}
      />
      {(isCenter || p.r > 12 || isHovered || isNeighbor) && (
        <KgPreviewNodeLabel p={p} label={node.label} isHovered={isHovered} />
      )}
    </g>
  );
}
