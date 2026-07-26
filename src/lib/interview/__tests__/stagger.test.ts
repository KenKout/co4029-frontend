import { describe, expect, it } from "vitest";

import {
  cardStaggerMs,
  cardStaggerStyle,
  rowStaggerMs,
  rowStaggerStyle,
} from "@/lib/interview/stagger";

describe("stagger delays", () => {
  it("gives the first element no delay", () => {
    expect(cardStaggerMs(0)).toBe(0);
    expect(rowStaggerMs(0)).toBe(0);
  });

  it("steps at the rhythm each surface already established", () => {
    // 60ms cards (adaptive-readiness-panel), 40ms rows (learning-outcomes).
    expect(cardStaggerMs(3)).toBe(180);
    expect(rowStaggerMs(3)).toBe(120);
  });

  it("caps so a long list still settles quickly", () => {
    // Without a cap the 40th row would wait 1.6s. Capped, the whole list is in
    // within ~300ms however long it is.
    expect(cardStaggerMs(500)).toBe(cardStaggerMs(5));
    expect(cardStaggerMs(500)).toBe(300);
    expect(rowStaggerMs(500)).toBe(rowStaggerMs(8));
    expect(rowStaggerMs(500)).toBe(320);
  });

  it("treats nonsense indexes as no delay rather than NaN in a style string", () => {
    // A NaN would render as `animationDelay: "NaNms"`, which browsers drop —
    // silently disabling the animation instead of failing loudly.
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(cardStaggerMs(bad)).toBe(0);
      expect(rowStaggerMs(bad)).toBe(0);
    }
  });

  it("emits a ready-to-spread style object", () => {
    expect(cardStaggerStyle(2)).toEqual({ animationDelay: "120ms" });
    expect(rowStaggerStyle(2)).toEqual({ animationDelay: "80ms" });
  });
});
