import { useRef } from "react";
import { createPortal } from "react-dom";

import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

import { KgCanvas } from "./knowledge-graph-detail/KgCanvas";
import { KgHeader } from "./knowledge-graph-detail/KgHeader";
import { KgLegend } from "./knowledge-graph-detail/KgLegend";
import { KgRelationPanel } from "./knowledge-graph-detail/KgRelationPanel";
import { KgZoomControls } from "./knowledge-graph-detail/KgZoomControls";
import type { KgSource } from "./knowledge-graph-detail/types";
import { useKgDerived } from "./knowledge-graph-detail/use-kg-derived";
import { useKgGraphData } from "./knowledge-graph-detail/use-kg-graph-data";
import { useKgInteraction } from "./knowledge-graph-detail/use-kg-interaction";
import { useKgLayout } from "./knowledge-graph-detail/use-kg-layout";

/**
 * Full-screen, interactive knowledge-graph explorer.
 *
 * The compact {@link KnowledgeGraphPreview} in material-hub gives a glanceable
 * thumbnail; this is the "open it up and actually explore" view. It reuses the
 * same {@link LessonKnowledgeGraph} data shape (fetched at a higher node limit
 * by the caller) and layers on:
 *
 *  - PAN   — drag empty canvas (or one-finger drag on touch) to move around.
 *  - ZOOM  — mouse wheel / pinch, or the +/- controls, zooming toward the
 *            pointer so the concept under the cursor stays put.
 *  - DRAG  — grab a node to reposition it; the layout is a starting point, not
 *            a cage, so a teacher can untangle a cluster.
 *  - DETAIL— single-click a node to pin a relationship panel listing its
 *            prerequisites, what it unlocks, and related concepts.
 *
 * Rendering is plain SVG with a single <g> transform (translate+scale) — no
 * physics sim and no graph library, so it stays dependency-free and the node
 * positions never jitter between renders. Coordinates live in an abstract
 * "world" space; the transform maps world→screen.
 *
 * This module is the orchestrator: data projections, interaction state and
 * composition. The layout maths, the camera maths, the stateful clusters and
 * every presentational region live in `./knowledge-graph-detail/*`.
 */

export type {
  KgLayoutMode,
  KgSource,
  KgVec,
} from "./knowledge-graph-detail/types";

export function KnowledgeGraphDetail({
  data,
  title,
  onClose,
  source = "ai",
  onSourceChange,
  onEdit,
}: {
  data: LessonKnowledgeGraph;
  title: string;
  onClose: () => void;
  /** Which graph is being displayed. The parent owns the fetch for each. */
  source?: KgSource;
  /** Omit to hide the AI/Curated toggle entirely (single-source callers). */
  onSourceChange?: (next: KgSource) => void;
  /** Omit to hide the Edit button. Only enabled while viewing `curated`. */
  onEdit?: () => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { nodes, edges, nodeById, maxW, minW } = useKgGraphData(data);
  const { layoutMode, setLayoutMode, positions, setPositions, positionsRef } =
    useKgLayout(nodes, edges);

  const {
    transform,
    smooth,
    hovered,
    pinned,
    setPinned,
    fitToView,
    zoomBy,
    selectNode,
    drag,
    onPointerDownBackground,
    onPointerDownNode,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onNodeTap,
    onNodeHoverEnter,
    onNodeHoverLeave,
  } = useKgInteraction({
    svgRef,
    positionsRef,
    setPositions,
    nodeCount: nodes.length,
    layoutMode,
    onClose,
  });

  const { pinnedRelations, activeId, neighborIds, pinnedScreen } = useKgDerived(
    {
      pinned,
      hovered,
      edges,
      positions,
      transform,
      nodeById,
      maxW,
      minW,
      svgRef,
    },
  );

  const overlay = (
    // Full-screen, edge-to-edge explorer (not a windowed dialog) — the graph
    // wants all the room it can get. Escape closes it (see the key handler);
    // node-detail closing is handled by the popup's own controls.
    <div
      className="fixed inset-0 z-50 flex flex-col bg-m3-surface"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <KgHeader
        title={title}
        nodeCount={nodes.length}
        source={source}
        onSourceChange={onSourceChange}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        onEdit={onEdit}
        onClose={onClose}
      />

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden">
        <KgCanvas
          svgRef={svgRef}
          title={title}
          nodes={nodes}
          edges={edges}
          positions={positions}
          nodeById={nodeById}
          maxW={maxW}
          minW={minW}
          activeId={activeId}
          neighborIds={neighborIds}
          transform={transform}
          smooth={smooth}
          dragKind={drag.current.kind}
          onPointerDownBackground={onPointerDownBackground}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          onPointerDownNode={onPointerDownNode}
          onNodeTap={onNodeTap}
          onNodeHoverEnter={onNodeHoverEnter}
          onNodeHoverLeave={onNodeHoverLeave}
        />

        <KgZoomControls
          onZoomIn={() => zoomBy(1.25)}
          onZoomOut={() => zoomBy(0.8)}
          onFitToView={fitToView}
        />

        <KgLegend />

        {pinned && pinnedRelations && pinnedScreen && nodeById.get(pinned) && (
          <KgRelationPanel
            node={nodeById.get(pinned)!}
            relations={pinnedRelations}
            screen={pinnedScreen}
            nodeById={nodeById}
            onClose={() => setPinned(null)}
            onJump={selectNode}
          />
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export default KnowledgeGraphDetail;
