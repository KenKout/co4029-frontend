import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useState } from "react";

import { useKgPointerGestures } from "./use-kg-pointer-gestures";
import type { Transform } from "./types";

/**
 * The KG pinch was reported as moving INVERTED vs one-finger pan on phones.
 * These tests pin the gesture math: two-finger drag must translate the graph
 * in the fingers' direction (like pan), spreading must zoom around the
 * fingers' midpoint, and the node-landing path must not fall back to the
 * (0,0) anchor.
 */

const FAKE_SVG = {
  getBoundingClientRect: () => ({ left: 0, top: 60, width: 400, height: 500 }),
  closest: () => null,
};

function evt(
  pointerId: number,
  x: number,
  y: number,
): React.PointerEvent {
  return {
    pointerId,
    clientX: x,
    clientY: y,
    target: { setPointerCapture: () => {} },
    currentTarget: FAKE_SVG,
    stopPropagation: () => {},
  } as unknown as React.PointerEvent;
}

function harness() {
  return renderHook(() => {
    const [transform, setTransform] = useState<Transform>({
      tx: 0,
      ty: 0,
      scale: 1,
    });
    const g = useKgPointerGestures({
      transform,
      setTransform,
      setPositions: () => {},
    });
    return { g, transform };
  });
}

function run(h: ReturnType<typeof harness>, fn: () => void) {
  act(() => fn());
  return h.result.current.transform;
}

describe("useKgPointerGestures pinch", () => {
  it("two-finger drag pans the graph WITH the fingers (same as one-finger pan)", () => {
    const h = harness();
    const { g } = h.result.current;
    // Fingers 100px apart at y=200; drag both right by 50px.
    run(h, () => {
      g.onPointerDownBackground(evt(1, 100, 200));
      g.onPointerDownBackground(evt(2, 200, 200));
      g.onPointerMove(evt(1, 150, 200));
      g.onPointerMove(evt(2, 250, 200));
    });
    const t = h.result.current.transform;
    // Midpoint moved (150→200): content must follow right, zoom unchanged.
    expect(t.tx).toBeCloseTo(50, 5);
    expect(t.ty).toBeCloseTo(0, 5);
    expect(t.scale).toBeCloseTo(1, 5);
  });

  it("spreading fingers zooms in around the midpoint (content under fingers stays put)", () => {
    const h = harness();
    const { g } = h.result.current;
    run(h, () => {
      g.onPointerDownBackground(evt(1, 100, 200));
      g.onPointerDownBackground(evt(2, 200, 200));
      g.onPointerMove(evt(1, 80, 200));
      g.onPointerMove(evt(2, 220, 200));
    });
    const t = h.result.current.transform;
    expect(t.scale).toBeGreaterThan(1.3);
    // The world point under the svg-local midpoint (150,140) must still map
    // to screen (150,140): screen = world*scale + tx.
    const worldUnderMidX = (150 - t.tx) / t.scale;
    const worldUnderMidY = (140 - t.ty) / t.scale;
    expect(150 - worldUnderMidX * t.scale - t.tx).toBeCloseTo(0, 5);
    expect(140 - worldUnderMidY * t.scale - t.ty).toBeCloseTo(0, 5);
  });

  it("pinch started over NODES anchors at the midpoint, not the (0,0) corner", () => {
    const h = harness();
    const { g } = h.result.current;
    // Both fingers land on nodes (the common case on a dense graph).
    run(h, () => {
      g.onPointerDownNode(evt(1, 100, 200), "a");
      g.onPointerDownNode(evt(2, 200, 200), "b");
      g.onPointerMove(evt(1, 80, 200));
    });
    const t = h.result.current.transform;
    expect(t.scale).toBeCloseTo(1.2, 5);
    // Anchored at prev midpoint (150,200), NOT (0,0). With the correct
    // anchor: tx = 150 - 1.2*150 = -30, then translate by the midpoint's
    // -10x drift → -40 (a (0,0) anchor would give tx = -10 with ty = 0).
    expect(t.tx).toBeCloseTo(-40, 5);
    expect(t.ty).toBeCloseTo(-40, 5);
  });

  it("pointerleave mid-pinch does not kill the gesture while two fingers are down", () => {
    const h = harness();
    const { g } = h.result.current;
    run(h, () => {
      g.onPointerDownBackground(evt(1, 100, 200));
      g.onPointerDownBackground(evt(2, 200, 200));
      g.onPointerLeave(evt(1, 100, 200)); // stray leave — must be ignored
      g.onPointerMove(evt(1, 150, 200));
      g.onPointerMove(evt(2, 250, 200));
    });
    const t = h.result.current.transform;
    expect(t.tx).toBeCloseTo(50, 5); // still pinching, not frozen
    expect(t.scale).toBeCloseTo(1, 5);
  });

  it("single-pointer mouse leave still cancels the drag", () => {
    const h = harness();
    const { g } = h.result.current;
    run(h, () => {
      g.onPointerDownBackground(evt(1, 100, 200));
      g.onPointerMove(evt(1, 150, 200));
    });
    expect(h.result.current.transform.tx).toBeCloseTo(50, 5);
    run(h, () => {
      g.onPointerLeave(evt(1, 150, 200));
      g.onPointerMove(evt(1, 200, 200));
    });
    expect(h.result.current.transform.tx).toBeCloseTo(50, 5); // no further move
  });
});
