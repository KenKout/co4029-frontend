import { MAX_SCALE, MIN_SCALE, WORLD_H, WORLD_W } from "./constants";
import type { KgVec, Transform } from "./types";

/**
 * Pure camera maths for the knowledge-graph explorer, extracted verbatim from
 * the former 863-line knowledge-graph-detail.tsx. Every function maps a current
 * {@link Transform} (plus the canvas box) to the next one, so the hooks that
 * own the state stay thin and the maths is shared rather than duplicated
 * between wheel-zoom and the +/- buttons.
 */

/** Just the parts of a DOMRect the camera needs. */
export interface CanvasBox {
  width: number;
  height: number;
}

/**
 * Fit the current layout into the viewport. Frames the ACTUAL node bounds
 * (not the fixed WORLD box) with padding, so both the compact circular layout
 * and a tall tree — which can extend well past WORLD_H via deep levels + the
 * orphan rows — open fully visible rather than clipped or zoomed into a corner.
 */
export function computeFitTransform(box: CanvasBox, pts: KgVec[]): Transform {
  let minX = 0;
  let minY = 0;
  let boxW = WORLD_W;
  let boxH = WORLD_H;
  if (pts.length > 0) {
    const pad = 120; // world units of breathing room around the extremes
    minX = Math.min(...pts.map((p) => p.x)) - pad;
    minY = Math.min(...pts.map((p) => p.y)) - pad;
    boxW = Math.max(...pts.map((p) => p.x)) + pad - minX;
    boxH = Math.max(...pts.map((p) => p.y)) + pad - minY;
  }
  const scale = Math.min(box.width / boxW, box.height / boxH, MAX_SCALE);
  return {
    scale,
    tx: (box.width - boxW * scale) / 2 - minX * scale,
    ty: (box.height - boxH * scale) / 2 - minY * scale,
  };
}

/**
 * Zoom toward a screen point: keep the world point under (sx, sy) fixed while
 * scaling, which is what makes zoom feel anchored rather than drifting. Shared
 * by wheel/pinch zoom and the +/- controls (which pass the canvas centre).
 */
export function zoomToward(
  prev: Transform,
  options: { sx: number; sy: number; factor: number },
): Transform {
  const { sx, sy, factor } = options;
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
  const k = scale / prev.scale;
  // Solve so (sx,sy) maps to the same world point before/after.
  return {
    scale,
    tx: sx - k * (sx - prev.tx),
    ty: sy - k * (sy - prev.ty),
  };
}

/**
 * Centre a world point in the canvas. Keeps the current zoom unless we're very
 * zoomed out, in which case it eases in a little so the focused node is
 * comfortably readable.
 */
export function focusTransform(
  prev: Transform,
  box: CanvasBox,
  p: KgVec,
): Transform {
  const scale = Math.min(MAX_SCALE, Math.max(prev.scale, 0.9));
  return {
    scale,
    tx: box.width / 2 - p.x * scale,
    ty: box.height / 2 - p.y * scale,
  };
}

/** Move one node by a world-space delta, returning a new positions map. */
export function translateNode(
  prev: Map<string, KgVec>,
  id: string,
  dxWorld: number,
  dyWorld: number,
): Map<string, KgVec> {
  const next = new Map(prev);
  const p = next.get(id);
  if (p) next.set(id, { x: p.x + dxWorld, y: p.y + dyWorld });
  return next;
}
