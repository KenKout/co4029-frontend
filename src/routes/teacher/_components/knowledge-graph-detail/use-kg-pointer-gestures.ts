import type { Dispatch, RefObject, SetStateAction } from "react";
import { useRef } from "react";

import { translateNode, zoomToward } from "./camera";
import type { KgDragKind, KgVec, Transform } from "./types";

/**
 * Pan + node-drag pointer gestures, extracted verbatim from the former 863-line
 * knowledge-graph-detail.tsx.
 *
 * A single pointer handler set covers pan, node-drag and two-finger pinch
 * (touch). `drag.current` tracks the single-pointer gesture so move/up don't
 * have to re-derive intent; `pointers` tracks every active pointer so a
 * second finger switches to pinch (zoom toward the fingers' midpoint, which
 * also pans as the midpoint moves).
 */
interface DragState {
  kind: KgDragKind;
  nodeId?: string;
  // last client coords (pan) or world offset from node centre (node drag)
  lastX: number;
  lastY: number;
  moved: boolean;
}

export interface KgPointerGestures {
  drag: RefObject<DragState>;
  onPointerDownBackground: (e: React.PointerEvent) => void;
  onPointerDownNode: (e: React.PointerEvent, nodeId: string) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

interface PointerPoint {
  x: number;
  y: number;
}

function pinchMetrics(points: Map<number, PointerPoint>): {
  dist: number;
  mx: number;
  my: number;
} {
  const pts = [...points.values()];
  const first = pts[0];
  const last = pts[pts.length - 1];
  return {
    dist: Math.hypot(last.x - first.x, last.y - first.y),
    mx: (first.x + last.x) / 2,
    my: (first.y + last.y) / 2,
  };
}

export function useKgPointerGestures(options: {
  transform: Transform;
  setTransform: Dispatch<SetStateAction<Transform>>;
  setPositions: Dispatch<SetStateAction<Map<string, KgVec>>>;
}): KgPointerGestures {
  const { transform, setTransform, setPositions } = options;

  const drag = useRef<DragState>({
    kind: null,
    lastX: 0,
    lastY: 0,
    moved: false,
  });
  const pointers = useRef(new Map<number, PointerPoint>());
  const pinch = useRef({ active: false, dist: 0 });

  const onPointerDownBackground = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Second finger down → pinch; the first finger's pan is cancelled.
    if (pointers.current.size >= 2) {
      pinch.current.active = true;
      pinch.current.dist = pinchMetrics(pointers.current).dist;
      drag.current.kind = null;
      return;
    }
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
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // A second finger anywhere starts the pinch, even over a node.
    if (pointers.current.size >= 2) {
      pinch.current.active = true;
      pinch.current.dist = pinchMetrics(pointers.current).dist;
      drag.current.kind = null;
      return;
    }
    drag.current = {
      kind: "node",
      nodeId,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current.active) {
      if (pointers.current.size >= 2) {
        const { dist, mx, my } = pinchMetrics(pointers.current);
        const factor = dist / pinch.current.dist;
        if (factor > 0 && Math.abs(factor - 1) > 0.001) {
          // Anchor the fingers' CURRENT midpoint: scaling keeps the world
          // point under it fixed, so midpoint movement pans along with it.
          setTransform((prev) => zoomToward(prev, { sx: mx, sy: my, factor }));
        }
        pinch.current.dist = dist;
      } else {
        // One finger lifted mid-pinch — end the gesture, don't resume pan.
        pinch.current.active = false;
        drag.current.kind = null;
      }
      return;
    }

    const d = drag.current;
    if (!d.kind) return;
    const dxScreen = e.clientX - d.lastX;
    const dyScreen = e.clientY - d.lastY;
    if (Math.abs(dxScreen) > 2 || Math.abs(dyScreen) > 2) d.moved = true;

    if (d.kind === "pan") {
      setTransform((prev) => ({
        ...prev,
        tx: prev.tx + dxScreen,
        ty: prev.ty + dyScreen,
      }));
    } else if (d.kind === "node" && d.nodeId) {
      // Convert the screen delta into world units so the node tracks the
      // cursor 1:1 regardless of zoom.
      const dxWorld = dxScreen / transform.scale;
      const dyWorld = dyScreen / transform.scale;
      const id = d.nodeId;
      setPositions((prev) => translateNode(prev, id, dxWorld, dyWorld));
    }
    d.lastX = e.clientX;
    d.lastY = e.clientY;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pinch.current.active && pointers.current.size < 2) {
      pinch.current.active = false;
    }
    drag.current.kind = null;
  };

  return {
    drag,
    onPointerDownBackground,
    onPointerDownNode,
    onPointerMove,
    onPointerUp,
  };
}
