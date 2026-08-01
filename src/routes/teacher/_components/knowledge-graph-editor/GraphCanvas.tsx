import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { ArrowMarkers } from "./ArrowMarkers";
import { GraphEdge } from "./GraphEdge";
import { GraphNode } from "./GraphNode";
import type { KnowledgeGraphEditorController } from "./use-knowledge-graph-editor";

/**
 * Plain SVG canvas with a single <g> transform (translate+scale), the same
 * dependency-free approach as the read-only explorer. Coordinates live in an
 * abstract "world" space that the transform maps to screen.
 */
export function GraphCanvas({
  editor,
}: {
  editor: KnowledgeGraphEditorController;
}) {
  const { t } = useTranslation();
  const { svgRef, pointer, nodeById, state } = editor;
  const { graph, sel, pos, camera, anim } = state;
  const { arrowMode, linkSource, selectedId, selectedEdge } = sel;
  const { positions } = pos;
  const { transform } = camera;
  const { drag } = pointer;

  return (
    <svg
      ref={svgRef}
      className={cn(
        "h-full w-full touch-none select-none",
        arrowMode
          ? "cursor-crosshair"
          : drag.current.kind === "pan"
            ? "cursor-grabbing"
            : "cursor-grab",
      )}
      onPointerDown={(e) => {
        pointer.onPointerDownBg(e);
        // Empty-canvas click clears selection and any pending arrow
        // source (without leaving arrow mode — Esc does that).
        if (linkSource) sel.setLinkSource(null);
        sel.setSelectedId(null);
        sel.setSelectedEdge(null);
      }}
      onPointerMove={pointer.onPointerMove}
      onPointerUp={pointer.onPointerUp}
      onPointerLeave={pointer.onPointerUp}
      role="application"
      aria-label={t("teacher_kg_editor.canvas_label")}
    >
      <ArrowMarkers />
      <g
        className={
          anim.smooth ? "transition-transform duration-[400ms]" : undefined
        }
        transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}
      >
        {/* Edges */}
        {graph.edges.map((e, i) => {
          const a = positions.get(e.source);
          const b = positions.get(e.target);
          if (!a || !b) return null;
          const isEdgeSelected =
            !!selectedEdge &&
            selectedEdge.source === e.source &&
            selectedEdge.target === e.target;
          return (
            <GraphEdge
              key={`${e.source}->${e.target}-${i}`}
              edge={e}
              a={a}
              b={b}
              sourceWeight={nodeById.get(e.source)?.weight ?? 1}
              targetWeight={nodeById.get(e.target)?.weight ?? 1}
              isEdgeSelected={isEdgeSelected}
              onSelect={() => {
                // In arrow mode clicks belong to node linking, not
                // selection.
                if (arrowMode) return;
                sel.setSelectedId(null);
                sel.setSelectedEdge((cur) =>
                  cur && cur.source === e.source && cur.target === e.target
                    ? null
                    : { source: e.source, target: e.target },
                );
              }}
            />
          );
        })}

        {/* Nodes */}
        {graph.nodes.map((n) => {
          const p = positions.get(n.id);
          if (!p) return null;
          return (
            <GraphNode
              key={n.id}
              node={n}
              p={p}
              isSelected={selectedId === n.id}
              isLinkSrc={linkSource === n.id}
              onPointerDownNode={(e) => pointer.onPointerDownNode(e, n.id)}
              onClickNode={() => pointer.onNodeClick(n.id)}
            />
          );
        })}
      </g>
    </svg>
  );
}
