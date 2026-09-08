import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useFullscreenDeterrent } from "@/lib/hooks/useFullscreenDeterrent";

/**
 * The `onUnexpectedExit` callback the quiz take uses to record a
 * `fullscreen_exit` integrity event.
 *
 * It hangs off the deterrent rather than off a `fullscreenchange` listener in
 * the integrity reporter because only the deterrent knows which exits were
 * OURS: it leaves fullscreen itself when the take ends, and logging that would
 * charge every student one exit for submitting. The interview's reporter does
 * listen directly and therefore does log its own exit — see the note in the
 * hook.
 *
 * The browser-API layer is mocked; jsdom has no Fullscreen API and what is
 * under test here is the policy on top.
 */

const enter = vi.fn(() => Promise.resolve(true));
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
      enter,
    };
  },
}));

beforeEach(() => {
  enter.mockClear();
  onUnexpectedExit = undefined;
  fullscreenState.supported = true;
  fullscreenState.isFullscreen = false;
});

describe("useFullscreenDeterrent onUnexpectedExit", () => {
  it("notifies the caller for each unexpected exit", () => {
    const record = vi.fn();
    renderHook(() => useFullscreenDeterrent(true, { onUnexpectedExit: record }));

    act(() => onUnexpectedExit?.());
    act(() => onUnexpectedExit?.());

    expect(record).toHaveBeenCalledTimes(2);
  });

  it("still counts exits and warns when no callback is passed", () => {
    const { result } = renderHook(() => useFullscreenDeterrent(true));

    act(() => onUnexpectedExit?.());

    // The interview passes no callback — the dialog behaviour must be
    // unchanged for it.
    expect(result.current.exitCount).toBe(1);
    expect(result.current.warningOpen).toBe(true);
  });

  it("does not prompt while the take is inactive", () => {
    const record = vi.fn();
    const { result } = renderHook(() =>
      useFullscreenDeterrent(false, { onUnexpectedExit: record }),
    );

    // A quiz left on `browser_security: 'none'` renders the dialogs with an
    // inactive deterrent, so nothing must open.
    expect(result.current.promptOpen).toBe(false);
    expect(result.current.warningOpen).toBe(false);
    expect(record).not.toHaveBeenCalled();
  });

  it("keeps using the latest callback without re-attaching", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ cb }) => useFullscreenDeterrent(true, { onUnexpectedExit: cb }),
      { initialProps: { cb: first } },
    );

    rerender({ cb: second });
    act(() => onUnexpectedExit?.());

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
