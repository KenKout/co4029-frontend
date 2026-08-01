import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import type { CuratedKGRelation } from "@/lib/api/types";

import { MAX_SCALE, MIN_SCALE } from "./constants";
import type { EditorState } from "./use-editor-state";
import type { DragState } from "./types";

export interface GraphPointer {
  drag: RefObject<DragState>;
  onPointerDownBg: (e: React.PointerEvent) => void;
  onPointerDownNode: (e: React.PointerEvent, nodeId: string) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onNodeClick: (nodeId: string) => void;
  zoomBy: (factor: number) => void;
}

/**
 * Pointer interaction for the canvas: background pan, node drag, click-to-select
 * (or click-to-link while arrow mode is armed), non-passive wheel zoom and the
 * button-driven zoom. The wheel listener is attached natively because React's
 * `onWheel` is passive and therefore cannot `preventDefault`.
 */
export function useGraphPointer(options: {
  state: EditorState;
  svgRef: RefObject<SVGSVGElement | null>;
  addEdge: (
    source: string,
    target: string,
    relation: CuratedKGRelation,
  ) => void;
  focusNode: (nodeId: string) => void;
}): GraphPointer {
  const { state, svgRef, addEdge, focusNode } = options;
  const { pos, camera, sel } = state;

  // --- Pointer interaction (pan + node drag) -------------------------------
  const drag = useRef<DragState>({
    kind: null,
    lastX: 0,
    lastY: 0,
    moved: false,
  });

  const onPointerDownBg = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = {
      kind: "pan",
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
  };

  const onPointerDownNode = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = {
      kind: "node",
      nodeId,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.kind) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true;
    if (d.kind === "pan") {
      camera.setTransform((prev) => ({
        ...prev,
        tx: prev.tx + dx,
        ty: prev.ty + dy,
      }));
    } else if (d.kind === "node" && d.nodeId) {
      const id = d.nodeId;
      pos.setPositions((prev) => {
        const next = new Map(prev);
        const p = next.get(id);
        if (p)
          next.set(id, {
            x: p.x + dx / camera.transform.scale,
            y: p.y + dy / camera.transform.scale,
          });
        return next;
      });
    }
    d.lastX = e.clientX;
    d.lastY = e.clientY;
  };

  const onPointerUp = () => {
    drag.current.kind = null;
  };

  const onNodeClick = (nodeId: string) => {
    if (drag.current.moved) return;
    // Arrow mode: first click arms the source, second completes the arrow with
    // the currently selected relation kind. Mode stays on for the next one.
    if (sel.arrowMode) {
      if (!sel.linkSource) {
        sel.setLinkSource(nodeId);
        return;
      }
      if (sel.linkSource !== nodeId) {
        addEdge(sel.linkSource, nodeId, sel.arrowRelation);
      }
      sel.setLinkSource(null);
      return;
    }
    sel.setSelectedEdge(null);
    sel.setSelectedId((cur) => (cur === nodeId ? null : nodeId));
    // Parity with the detail screen: selecting a node glides the camera to it.
    focusNode(nodeId);
  };

  // Native non-passive wheel zoom (React onWheel is passive → can't
  // preventDefault, which would let ctrl+scroll zoom the browser page).
  // Identical maths to knowledge-graph-detail.tsx: zoom toward the pointer so
  // the concept under the cursor stays put.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      camera.setTransform((prev) => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const scale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, prev.scale * factor),
        );
        const k = scale / prev.scale;
        return {
          scale,
          tx: sx - k * (sx - prev.tx),
          ty: sy - k * (sy - prev.ty),
        };
      });
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, []);

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = rect.width / 2;
    const sy = rect.height / 2;
    camera.setTransform((prev) => {
      const scale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, prev.scale * factor),
      );
      const k = scale / prev.scale;
      return {
        scale,
        tx: sx - k * (sx - prev.tx),
        ty: sy - k * (sy - prev.ty),
      };
    });
  };

  return {
    drag,
    onPointerDownBg,
    onPointerDownNode,
    onPointerMove,
    onPointerUp,
    onNodeClick,
    zoomBy,
  };
}
