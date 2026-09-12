/**
 * Unit tests for the mandatory fullscreen gate hook shared by every
 * proctored assessment — interview take and quiz take alike
 * (`useAssessmentFullscreenGate`).
 *
 * `useAssessmentFullscreen` (the browser-API layer underneath) is mocked,
 * because jsdom has no Fullscreen API and what matters here is the POLICY on
 * top: locked until granted, denied/unsupported never unlock, exits are
 * counted, and everything resets when the session is no longer active.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useAssessmentFullscreenGate } from "@/lib/hooks/useAssessmentFullscreenGate";

const enter = vi.fn(() => Promise.resolve(true));
const exitFullscreen = vi.fn(() => Promise.resolve());
const isFullscreenNow = vi.fn(() => false);
let onUnexpectedExit: (() => void) | undefined;
const fullscreenState = { supported: true, isFullscreen: false };

vi.mock("@/lib/hooks/useAssessmentFullscreen", () => ({
  useAssessmentFullscreen: (
    _active: boolean,
    opts?: { onUnexpectedExit?: () => void },
  ) => {
    onUnexpectedExit = opts?.onUnexpectedExit;
    return {
      supported: fullscreenState.supported,
      isFullscreen: fullscreenState.isFullscreen,
      isFullscreenNow,
      enter,
      exit: exitFullscreen,
    };
  },
  // The gate re-checks the shared helper before trusting `enter()`.
  currentFullscreenElement: () =>
    fullscreenState.isFullscreen ? document.documentElement : null,
}));

beforeEach(() => {
  enter.mockClear();
  exitFullscreen.mockClear();
  isFullscreenNow.mockClear();
  isFullscreenNow.mockImplementation(() => false);
  onUnexpectedExit = undefined;
  fullscreenState.supported = true;
  fullscreenState.isFullscreen = false;
  enter.mockImplementation(() => Promise.resolve(true));
});

describe("useAssessmentFullscreenGate", () => {
  it("starts idle and unlocked, and requiredOpen follows the active flag", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useAssessmentFullscreenGate(active),
      { initialProps: { active: false } },
    );
    expect(result.current.requestState).toBe("idle");
    expect(result.current.requiredOpen).toBe(false);

    rerender({ active: true });
    expect(result.current.requiredOpen).toBe(true);
  });

  it("grants when enter() succeeds and the DOM confirms", async () => {
    isFullscreenNow.mockImplementation(() => true);
    const { result } = renderHook(() => useAssessmentFullscreenGate(true));

    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.enter();
    });

    expect(granted).toBe(true);
    expect(result.current.requestState).toBe("granted");
    expect(enter).toHaveBeenCalledTimes(1);
  });

  it("stays locked when the request is denied — never a windowed fallback", async () => {
    // The core of the mandatory policy: a denial is NOT consent. The caller
    // decides what to render; the gate only promises that requestState says
    // `denied` and requiredOpen keeps the screen locked.
    enter.mockImplementation(() => Promise.resolve(false));
    const { result } = renderHook(() => useAssessmentFullscreenGate(true));

    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.enter();
    });

    expect(granted).toBe(false);
    expect(result.current.requestState).toBe("denied");
    expect(result.current.requiredOpen).toBe(true);
  });

  it("marks unsupported without issuing a request", async () => {
    fullscreenState.supported = false;
    const { result } = renderHook(() => useAssessmentFullscreenGate(true));

    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.enter();
    });

    expect(granted).toBe(false);
    expect(result.current.requestState).toBe("unsupported");
    expect(enter).not.toHaveBeenCalled();
    expect(result.current.requiredOpen).toBe(true);
  });

  it("short-circuits to granted when the DOM is already fullscreen", async () => {
    fullscreenState.isFullscreen = true;
    const { result } = renderHook(() => useAssessmentFullscreenGate(true));

    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.enter();
    });

    expect(granted).toBe(true);
    expect(result.current.requestState).toBe("granted");
    expect(enter).not.toHaveBeenCalled();
  });

  it("counts unexpected exits and resets the request state on each", () => {
    const onExitCallback = vi.fn();
    const { result } = renderHook(() =>
      useAssessmentFullscreenGate(true, { onUnexpectedExit: onExitCallback }),
    );

    act(() => {
      onUnexpectedExit?.();
      onUnexpectedExit?.();
    });

    expect(result.current.exitCount).toBe(2);
    expect(onExitCallback).toHaveBeenCalledTimes(2);
  });

  it("never re-enters on its own after an unexpected exit", () => {
    // A browser requires a user gesture; the gate screen's button is the path
    // back. The hook itself must not call enter().
    const { result } = renderHook(() => useAssessmentFullscreenGate(true));
    act(() => onUnexpectedExit?.());
    expect(enter).not.toHaveBeenCalled();
    // Still locked.
    expect(result.current.requiredOpen).toBe(true);
  });

  it("resets request state and exit count when the session ends", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useAssessmentFullscreenGate(active),
      { initialProps: { active: true } },
    );
    act(() => onUnexpectedExit?.());
    expect(result.current.exitCount).toBe(1);

    rerender({ active: false });
    expect(result.current.exitCount).toBe(0);
    expect(result.current.requestState).toBe("idle");
    expect(result.current.requiredOpen).toBe(false);

    // A fresh attempt starts clean and locks again until granted.
    rerender({ active: true });
    expect(result.current.requiredOpen).toBe(true);
  });

  it("delegates intentional exits to the browser layer", async () => {
    const { result } = renderHook(() => useAssessmentFullscreenGate(true));
    await act(async () => {
      await result.current.exit(true);
    });
    expect(exitFullscreen).toHaveBeenCalledWith(true);
  });
});
