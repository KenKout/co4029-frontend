import type { Dispatch, RefObject, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { computeFitTransform, focusTransform, zoomToward } from "./camera";
import type { KgLayoutMode, KgVec, Transform } from "./types";
import { useKgEscapeClose } from "./use-kg-escape-close";
import type { KgPointerGestures } from "./use-kg-pointer-gestures";
import { useKgPointerGestures } from "./use-kg-pointer-gestures";
import { useKgWheelZoom } from "./use-kg-wheel-zoom";

/**
 * The whole camera + selection interaction cluster of the knowledge-graph
 * explorer, extracted from the former 863-line knowledge-graph-detail.tsx.
 *
 * Hook call order is preserved EXACTLY as it was inline: transform → smooth →
 * smoothTimer → hovered → pinned → fitToView → refit effect → escape effect →
 * drag ref → wheel effect → focusNode → cleanup effect → selectNode.
 */
export interface KgInteraction extends KgPointerGestures {
  transform: Transform;
  /**
   * When true, the world <g> animates its transform (used for camera focus so
   * the jump to a clicked node glides). Turned off during pan/drag/zoom so
   * those stay instant and lag-free.
   */
  smooth: boolean;
  hovered: string | null;
  /** The node whose relationship panel is pinned. */
  pinned: string | null;
  setPinned: Dispatch<SetStateAction<string | null>>;
  fitToView: () => void;
  zoomBy: (factor: number) => void;
  selectNode: (nodeId: string) => void;
  /** Single click on a node: toggles selection unless the click was a drag. */
  onNodeTap: (nodeId: string) => void;
  onNodeHoverEnter: (nodeId: string) => void;
  onNodeHoverLeave: () => void;
}

export function useKgInteraction(options: {
  svgRef: RefObject<SVGSVGElement | null>;
  positionsRef: RefObject<Map<string, KgVec>>;
  setPositions: Dispatch<SetStateAction<Map<string, KgVec>>>;
  /** Node count — refits the camera whenever the node set changes. */
  nodeCount: number;
  layoutMode: KgLayoutMode;
  onClose: () => void;
}): KgInteraction {
  const { svgRef, positionsRef, setPositions, nodeCount, layoutMode, onClose } =
    options;

  const [transform, setTransform] = useState<Transform>({
    tx: 0,
    ty: 0,
    scale: 1,
  });
  const [smooth, setSmooth] = useState(false);
  const smoothTimer = useRef<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  // Now a SINGLE click selects a node: it pins the panel and focuses the camera
  // on that node.
  const [pinned, setPinned] = useState<string | null>(null);

  // Fit the current layout into the viewport. Reads positionsRef so it always
  // sees the latest layout.
  const fitToView = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pts = Array.from(positionsRef.current.values());
    setTransform(computeFitTransform(rect, pts));
  }, []);

  // Refit whenever the node set OR the layout mode changes. Deferred a frame so
  // the positions state (set in the layout effect) has committed before we
  // measure it.
  useEffect(() => {
    const id = requestAnimationFrame(() => fitToView());
    return () => cancelAnimationFrame(id);
  }, [fitToView, nodeCount, layoutMode]);

  useKgEscapeClose({ onClose, pinned, setPinned });

  const gestures = useKgPointerGestures({
    transform,
    setTransform,
    setPositions,
  });

  useKgWheelZoom(svgRef, setTransform);

  // Glide the camera so a node lands in the centre of the canvas. Called on
  // single-click and on relation-chip jumps. Enables the transform transition
  // for the move, then disables it after the animation so pan/zoom stay instant.
  const focusNode = useCallback((nodeId: string) => {
    const svg = svgRef.current;
    const p = positionsRef.current.get(nodeId);
    if (!svg || !p) return;
    const rect = svg.getBoundingClientRect();
    setSmooth(true);
    if (smoothTimer.current) window.clearTimeout(smoothTimer.current);
    smoothTimer.current = window.setTimeout(() => setSmooth(false), 420);
    setTransform((prev) => focusTransform(prev, rect, p));
  }, []);

  useEffect(() => {
    return () => {
      if (smoothTimer.current) window.clearTimeout(smoothTimer.current);
    };
  }, []);

  // Select a node: pin its relationship panel AND glide the camera to centre
  // it. Shared by single-click on a node and by relation-chip jump clicks, so
  // both routes behave identically. Always focuses (even when re-selecting via
  // a chip) so jumping to an off-screen neighbour brings it into view.
  const selectNode = useCallback(
    (nodeId: string) => {
      setPinned(nodeId);
      setHovered(null);
      focusNode(nodeId);
    },
    [focusNode],
  );

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = rect.width / 2;
    const sy = rect.height / 2;
    setTransform((prev) => zoomToward(prev, { sx, sy, factor }));
  };

  // A single click that didn't turn into a drag SELECTS the node: pin its
  // relationship panel and glide the camera so the node centres. Clicking the
  // already-selected node clears the selection. (Was double-click before.)
  const onNodeTap = (nodeId: string) => {
    if (gestures.drag.current.moved) return;
    if (pinned === nodeId) setPinned(null);
    else selectNode(nodeId);
  };

  const onNodeHoverEnter = (nodeId: string) => {
    if (!pinned) setHovered(nodeId);
  };

  const onNodeHoverLeave = () => {
    if (!pinned) setHovered(null);
  };

  return {
    ...gestures,
    transform,
    smooth,
    hovered,
    pinned,
    setPinned,
    fitToView,
    zoomBy,
    selectNode,
    onNodeTap,
    onNodeHoverEnter,
    onNodeHoverLeave,
  };
}
