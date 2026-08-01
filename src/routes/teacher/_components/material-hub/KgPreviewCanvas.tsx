import { useTranslation } from "react-i18next";

import { KG_H, KG_W } from "./constants";
import { KgPreviewArrowDefs } from "./KgPreviewArrowDefs";
import { KgPreviewEdge } from "./KgPreviewEdge";
import { KgPreviewHoverCard } from "./KgPreviewHoverCard";
import { KgPreviewNode } from "./KgPreviewNode";
import type { KgPreviewController } from "./use-kg-preview";

/**
 * The preview SVG: arrow defs, the edge layer, the node layer and the hover
 * card. Extracted verbatim from the former 1422-line material-hub.tsx.
 */
export function KgPreviewCanvas({ kg }: { kg: KgPreviewController }) {
  const { t } = useTranslation();
  const {
    nodes,
    edges,
    positions,
    hovered,
    setHovered,
    hoveredNode,
    neighborIds,
  } = kg;
  return (
    <div className="relative">
      <svg
        width="100%"
        viewBox={`0 0 ${KG_W} ${KG_H}`}
        className="rounded-xl bg-m3-surface-container-lowest/40"
        role="img"
        aria-label={t("teacher_lesson_materials.kg.title")}
      >
        <KgPreviewArrowDefs />
        {/* Edges — dashed amber for prerequisites, solid grey for related.
            Directed source → target with an arrowhead. On node hover the
            connected edges keep their relation colour but shift to a
            higher-contrast shade and thicken; the rest dim. */}
        {edges.map((e, i) => (
          <KgPreviewEdge
            key={i}
            edge={e}
            a={positions.get(e.source)}
            b={positions.get(e.target)}
            hovered={hovered}
          />
        ))}
        {nodes.map((n, i) => (
          <KgPreviewNode
            key={n.id}
            node={n}
            index={i}
            p={positions.get(n.id)}
            hovered={hovered}
            neighborIds={neighborIds}
            setHovered={setHovered}
          />
        ))}
      </svg>
      {/* Hover detail card */}
      {hoveredNode && <KgPreviewHoverCard node={hoveredNode} />}
    </div>
  );
}
