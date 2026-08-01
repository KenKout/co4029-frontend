import { useCallback, useEffect } from "react";
import type { RefObject } from "react";

import { MAX_SCALE, WORLD_H, WORLD_W } from "./constants";
import type { EditorState } from "./use-editor-state";

export interface GraphCamera {
  fitToView: () => void;
  focusNode: (nodeId: string) => void;
}

/**
 * Camera controls shared with the read-only detail explorer: fit-to-content and
 * the glide that centres a freshly selected node. The glide enables the world
 * transform transition for its duration only, so pan/zoom/drag stay instant.
 */
export function useGraphCamera(options: {
  state: EditorState;
  svgRef: RefObject<SVGSVGElement | null>;
}): GraphCamera {
  const { state, svgRef } = options;
  const { hist, pos, camera, anim } = state;

  // --- Fit to view ---------------------------------------------------------
  const fitToView = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pts = Array.from(pos.positionsRef.current.values());
    let minX = 0;
    let minY = 0;
    let boxW = WORLD_W;
    let boxH = WORLD_H;
    if (pts.length > 0) {
      const pad = 140;
      minX = Math.min(...pts.map((p) => p.x)) - pad;
      minY = Math.min(...pts.map((p) => p.y)) - pad;
      boxW = Math.max(...pts.map((p) => p.x)) + pad - minX;
      boxH = Math.max(...pts.map((p) => p.y)) + pad - minY;
    }
    const scale = Math.min(rect.width / boxW, rect.height / boxH, MAX_SCALE);
    camera.setTransform({
      scale,
      tx: (rect.width - boxW * scale) / 2 - minX * scale,
      ty: (rect.height - boxH * scale) / 2 - minY * scale,
    });
  }, []);

  useEffect(() => {
    // Fit once positions are first seeded.
    if (pos.positions.size > 0) {
      const id = requestAnimationFrame(() => fitToView());
      return () => cancelAnimationFrame(id);
    }
  }, [fitToView, hist.isInitialized()]);

  // Glide the camera so a node lands in the centre of the canvas — identical to
  // the read-only detail screen's focusNode, so selecting a concept behaves the
  // same in both. Enables the transform transition for the move, then disables
  // it so subsequent pan/zoom stay instant.
  const focusNode = useCallback((nodeId: string) => {
    const svg = svgRef.current;
    const p = pos.positionsRef.current.get(nodeId);
    if (!svg || !p) return;
    const rect = svg.getBoundingClientRect();
    anim.beginSmooth(420);
    camera.setTransform((prev) => {
      // Ease in a little if we're very zoomed out, so the focused node is
      // comfortably readable — matches the detail screen's behaviour.
      const scale = Math.min(MAX_SCALE, Math.max(prev.scale, 0.9));
      return {
        scale,
        tx: rect.width / 2 - p.x * scale,
        ty: rect.height / 2 - p.y * scale,
      };
    });
  }, []);

  useEffect(
    () => () => {
      anim.clearSmoothTimer();
    },
    [],
  );

  return { fitToView, focusNode };
}
