import type { Dispatch, RefObject, SetStateAction } from "react";
import { useEffect } from "react";

import { zoomToward } from "./camera";
import type { Transform } from "./types";

/**
 * Wheel / pinch zoom toward the pointer, extracted verbatim from the former
 * 863-line knowledge-graph-detail.tsx.
 *
 * Attached as a NATIVE, non-passive listener rather than via React's onWheel.
 * React registers wheel handlers as passive, so e.preventDefault() there is
 * silently ignored — which is why ctrl+scroll used to zoom the whole browser
 * page instead of the canvas. A non-passive listener lets us cancel that
 * default. We zoom the canvas on every wheel, and on ctrl/⌘+wheel (trackpad
 * pinch / browser-zoom gesture) we ALSO preventDefault so the page never zooms
 * out from under the graph.
 */
export function useKgWheelZoom(
  svgRef: RefObject<SVGSVGElement | null>,
  setTransform: Dispatch<SetStateAction<Transform>>,
): void {
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      // Always cancel: prevents page scroll on plain wheel and, crucially,
      // browser page-zoom on ctrl/⌘+wheel.
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      setTransform((prev) =>
        zoomToward(prev, {
          sx,
          sy,
          factor: Math.exp(-e.deltaY * 0.0015),
        }),
      );
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, []);
}
