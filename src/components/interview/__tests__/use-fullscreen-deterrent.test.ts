import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useFullscreenDeterrent } from "@/components/interview/use-fullscreen-deterrent";

/**
 * The fullscreen deterrent policy, tested through the hook.
 *
 * `useInterviewFullscreen` (the browser-API layer underneath) is mocked, because
 * jsdom has no Fullscreen API and what matters here is the policy on top: ask
 * once, count exits, and reset when the session ends.
 *
 * The reset behaviour is the one worth pinning. Without it, a candidate starting
 * a SECOND attempt in the same page session would never be prompted again and
 * would carry the previous attempt's exit count into the new one — i.e. the
 * warning dialog would accuse them of exits that happened in a finished
 * interview.
 */

const enter = vi.fn(() => Promise.resolve(true));
let onUnexpectedExit: (() => void) | undefined;
const fullscreenState = { supported: true, isFullscreen: false };

vi.mock("@/components/interview/use-interview-fullscreen", () => ({
  useInterviewFullscreen: (
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

describe("useFullscreenDeterrent", () => {
  it("stays quiet until the interview goes active", () => {
    const { result } = renderHook(() => useFullscreenDeterrent(false));
    expect(result.current.promptOpen).toBe(false);
  });

  it("prompts once when a session goes live", () => {
    const { result } = renderHook(() => useFullscreenDeterrent(true));
    expect(result.current.promptOpen).toBe(true);
  });

  it("does not re-prompt after the candidate declines", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useFullscreenDeterrent(active),
      { initialProps: { active: true } },
    );
    act(() => result.current.declinePrompt());
    expect(result.current.promptOpen).toBe(false);
    rerender({ active: true });
    rerender({ active: true });
    expect(result.current.promptOpen).toBe(false);
  });

  it("does not re-prompt when fullscreen state changes mid-session", () => {
    // The real job of the prompted-once ref. Plain re-renders do not re-run the
    // effect (its deps are unchanged), so only a dep actually changing exercises
    // the guard: the candidate declines, then enters fullscreen by their own F11
    // and leaves again, flipping isFullscreen true->false. Without the ref that
    // reopens the dialog they already dismissed.
    const { result, rerender } = renderHook(
      ({ active }) => useFullscreenDeterrent(active),
      { initialProps: { active: true } },
    );
    act(() => result.current.declinePrompt());
    expect(result.current.promptOpen).toBe(false);

    fullscreenState.isFullscreen = true;
    rerender({ active: true });
    fullscreenState.isFullscreen = false;
    rerender({ active: true });

    expect(result.current.promptOpen).toBe(false);
  });

  it("skips the prompt when fullscreen is unsupported", () => {
    fullscreenState.supported = false;
    const { result } = renderHook(() => useFullscreenDeterrent(true));
    expect(result.current.promptOpen).toBe(false);
  });

  it("skips the prompt when already fullscreen", () => {
    fullscreenState.isFullscreen = true;
    const { result } = renderHook(() => useFullscreenDeterrent(true));
    expect(result.current.promptOpen).toBe(false);
  });

  it("counts each unexpected exit and opens the warning", () => {
    const { result } = renderHook(() => useFullscreenDeterrent(true));
    act(() => onUnexpectedExit?.());
    expect(result.current.exitCount).toBe(1);
    expect(result.current.warningOpen).toBe(true);

    act(() => result.current.dismissWarning());
    act(() => onUnexpectedExit?.());
    expect(result.current.exitCount).toBe(2);
    expect(result.current.warningOpen).toBe(true);
  });

  it("enters fullscreen when the prompt is accepted", () => {
    const { result } = renderHook(() => useFullscreenDeterrent(true));
    act(() => result.current.acceptPrompt());
    expect(result.current.promptOpen).toBe(false);
    expect(enter).toHaveBeenCalledTimes(1);
  });

  it("re-enters fullscreen from the warning", () => {
    const { result } = renderHook(() => useFullscreenDeterrent(true));
    act(() => onUnexpectedExit?.());
    act(() => result.current.reenter());
    expect(result.current.warningOpen).toBe(false);
    expect(enter).toHaveBeenCalledTimes(1);
  });

  it("resets prompt, warning and exit count when the session ends", () => {
    // A second attempt in the same page session must start clean, or the warning
    // would report exits from an interview that already finished.
    const { result, rerender } = renderHook(
      ({ active }) => useFullscreenDeterrent(active),
      { initialProps: { active: true } },
    );
    act(() => onUnexpectedExit?.());
    expect(result.current.exitCount).toBe(1);

    rerender({ active: false });
    expect(result.current.exitCount).toBe(0);
    expect(result.current.warningOpen).toBe(false);
    expect(result.current.promptOpen).toBe(false);

    // ...and a fresh session prompts again.
    rerender({ active: true });
    expect(result.current.promptOpen).toBe(true);
  });
});
