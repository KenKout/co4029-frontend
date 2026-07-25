import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useInterviewFullscreen } from "../use-interview-fullscreen";

/**
 * jsdom implements neither requestFullscreen nor exitFullscreen, so both are
 * stubbed here and `document.fullscreenElement` is driven manually alongside a
 * dispatched `fullscreenchange` — exactly the sequence a real browser produces.
 */
function setFullscreenElement(element: Element | null) {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: element,
  });
}

let requestFullscreen: ReturnType<typeof vi.fn>;
let exitFullscreen: ReturnType<typeof vi.fn>;

beforeEach(() => {
  setFullscreenElement(null);
  requestFullscreen = vi.fn(() => {
    setFullscreenElement(document.documentElement);
    document.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  });
  exitFullscreen = vi.fn(() => {
    setFullscreenElement(null);
    document.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  });
  Object.defineProperty(document.documentElement, "requestFullscreen", {
    configurable: true,
    value: requestFullscreen,
  });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    value: exitFullscreen,
  });
});

afterEach(() => {
  setFullscreenElement(null);
  vi.restoreAllMocks();
});

describe("useInterviewFullscreen", () => {
  it("reports support and enters fullscreen on request", async () => {
    const { result } = renderHook(() => useInterviewFullscreen(true));

    expect(result.current.supported).toBe(true);
    expect(result.current.isFullscreen).toBe(false);

    await act(async () => {
      await result.current.enter();
    });

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(result.current.isFullscreen).toBe(true);
  });

  it("warns when the user leaves fullscreen during an active interview", async () => {
    const onUnexpectedExit = vi.fn();
    const { result } = renderHook(() =>
      useInterviewFullscreen(true, { onUnexpectedExit }),
    );

    await act(async () => {
      await result.current.enter();
    });

    // Simulate Escape / F11: the element goes away without us asking.
    await act(async () => {
      setFullscreenElement(null);
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(onUnexpectedExit).toHaveBeenCalledTimes(1);
    expect(result.current.isFullscreen).toBe(false);
  });

  it("does not warn when the hook itself exits fullscreen", async () => {
    const onUnexpectedExit = vi.fn();
    const { result } = renderHook(() =>
      useInterviewFullscreen(true, { onUnexpectedExit }),
    );

    await act(async () => {
      await result.current.enter();
    });
    await act(async () => {
      await result.current.exit();
    });

    expect(exitFullscreen).toHaveBeenCalledTimes(1);
    expect(onUnexpectedExit).not.toHaveBeenCalled();
  });

  it("does not warn when the interview is no longer active", async () => {
    const onUnexpectedExit = vi.fn();
    const { result } = renderHook(
      ({ active }) => useInterviewFullscreen(active, { onUnexpectedExit }),
      { initialProps: { active: false } },
    );

    await act(async () => {
      await result.current.enter();
    });
    await act(async () => {
      setFullscreenElement(null);
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(onUnexpectedExit).not.toHaveBeenCalled();
  });

  it("leaves fullscreen automatically once the interview stops being active", async () => {
    const { result, rerender } = renderHook(
      ({ active }) => useInterviewFullscreen(active),
      { initialProps: { active: true } },
    );

    await act(async () => {
      await result.current.enter();
    });
    expect(result.current.isFullscreen).toBe(true);

    await act(async () => {
      rerender({ active: false });
    });

    expect(exitFullscreen).toHaveBeenCalled();
    expect(result.current.isFullscreen).toBe(false);
  });

  it("survives a browser that refuses the fullscreen request", async () => {
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: vi.fn(() => Promise.reject(new Error("denied"))),
    });

    const { result } = renderHook(() => useInterviewFullscreen(true));

    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.enter();
    });

    expect(granted).toBe(false);
    expect(result.current.isFullscreen).toBe(false);
  });
});
