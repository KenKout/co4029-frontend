import type { Dispatch, RefObject, SetStateAction } from "react";
import { useRef } from "react";

import { translateNode } from "./camera";
import type { KgDragKind, KgVec, Transform } from "./types";

/**
 * Pan + node-drag pointer gestures, extracted verbatim from the former 863-line
 * knowledge-graph-detail.tsx.
 *
 * A single pointer handler set covers both gestures. `drag.current` tracks which
 * one is active so move/up don't have to re-derive intent.
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
  onPointerUp: () => void;
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

  const onPointerDownBackground = (e: React.PointerEvent) => {
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

  const onPointerUp = () => {
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
