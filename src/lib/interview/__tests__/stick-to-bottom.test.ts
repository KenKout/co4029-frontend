/**
 * Stick-to-bottom geometry for the transcript scroller.
 */
import { describe, it, expect } from "vitest";

import {
  isNearBottom,
  STICK_TO_BOTTOM_THRESHOLD_PX,
} from "@/lib/interview/stick-to-bottom";

const viewport = (scrollHeight: number, scrollTop: number, clientHeight: number) => ({
  scrollHeight,
  scrollTop,
  clientHeight,
});

describe("isNearBottom", () => {
  it("is pinned at the exact bottom", () => {
    // 1000 - 800 - 200 = 0
    expect(isNearBottom(viewport(1000, 800, 200))).toBe(true);
  });

  it("stays pinned while the unread remainder fits the threshold", () => {
    // 1000 - 700 - 200 = 100 <= 120 — e.g. the typing indicator just mounted
    expect(isNearBottom(viewport(1000, 700, 200))).toBe(true);
  });

  it("un-pins once the candidate has scrolled back to read", () => {
    // 1000 - 300 - 200 = 500 > 120
    expect(isNearBottom(viewport(1000, 300, 200))).toBe(false);
  });

  it("is pinned when the content does not overflow yet", () => {
    // Fresh session: 400 - 0 - 500 = -100
    expect(isNearBottom(viewport(400, 0, 500))).toBe(true);
  });

  it("respects a custom threshold", () => {
    expect(isNearBottom(viewport(1000, 700, 200), 50)).toBe(false);
    expect(isNearBottom(viewport(1000, 760, 200), 50)).toBe(true);
  });

  it("ships a sane default threshold", () => {
    expect(STICK_TO_BOTTOM_THRESHOLD_PX).toBeGreaterThan(0);
  });
});
