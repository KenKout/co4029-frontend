import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAssessmentFullscreen } from "@/lib/hooks/useAssessmentFullscreen";

/**
 * Audit P1 (fullscreen gate exact element): only the DOCUMENT ROOT counts as
 * a granted gate. A foreign element holding fullscreen (a video player, a
 * previous assessment that never exited) must be REPLACED — never accepted —
 * and a takeover failure must refuse the gate instead of faking success.
 */

type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

function mockFullscreenState(element: Element | null) {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => element,
  });
  (document as FsDoc).webkitFullscreenElement = element;
  if (typeof document.exitFullscreen !== "function") {
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      writable: true,
      value: () => Promise.resolve(),
    });
  }
}

describe("useAssessmentFullscreen exact-element gate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockFullscreenState(null);
  });

  afterEach(() => {
    mockFullscreenState(null);
  });

  it("accepts the document root as already granted", async () => {
    mockFullscreenState(document.documentElement);
    const { result } = renderHook(() => useAssessmentFullscreen(true));
    await act(async () => {
      const granted = await result.current.enter();
      expect(granted).toBe(true);
    });
    // No new request issued: still the root, nothing else happened.
    expect(result.current.isFullscreenNow()).toBe(true);
  });

  it("refuses when a foreign element holds fullscreen and cannot be exited", async () => {
    const foreign = document.createElement("div");
    mockFullscreenState(foreign);
    const exitSpy = vi
      .spyOn(document, "exitFullscreen")
      .mockRejectedValue(new Error("denied"));
    const { result } = renderHook(() => useAssessmentFullscreen(true));
    await act(async () => {
      const granted = await result.current.enter();
      expect(granted).toBe(false);
    });
    expect(exitSpy).toHaveBeenCalled();
  });

  it("exits the foreign element then requests the root", async () => {
    const foreign = document.createElement("div");
    mockFullscreenState(foreign);
    vi.spyOn(document, "exitFullscreen").mockResolvedValue(undefined);
    // After the exit resolves, the fullscreen state is clear and the root
    // request "succeeds" (state flips to root fullscreen).
    const root = document.documentElement;
    if (typeof root.requestFullscreen !== "function") {
      Object.defineProperty(root, "requestFullscreen", {
        configurable: true,
        writable: true,
        value: () => Promise.resolve(),
      });
    }
    vi.spyOn(root, "requestFullscreen").mockImplementation(async () => {
      mockFullscreenState(root);
      return undefined as never;
    });
    const { result } = renderHook(() => useAssessmentFullscreen(true));
    await act(async () => {
      const granted = await result.current.enter();
      expect(granted).toBe(true);
    });
    expect(document.fullscreenElement).toBe(root);
  });
});
