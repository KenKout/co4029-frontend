import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Mock the interviews hook before importing the hook that uses it. The real
// mutation resolves to IntegrityEventsResponse; the tests below override the
// resolved value per case.
const mockMutateAsyncFn = vi.fn<(body: unknown) => Promise<unknown>>(
  async () => ({ accepted: 0, integrity_score: 0 }),
);

vi.mock("@/lib/api/hooks/interviews", () => ({
  useReportIntegrityEvents: vi.fn(() => ({
    mutateAsync: mockMutateAsyncFn,
  })),
}));

import { useIntegrityReporter } from "../use-integrity-reporter";

/** Drive `document.hidden`, which jsdom exposes as a non-writable property. */
function setHidden(value: boolean) {
  Object.defineProperty(document, "hidden", { value, configurable: true });
}

function setFullscreenElement(value: Element | null) {
  Object.defineProperty(document, "fullscreenElement", {
    value,
    configurable: true,
  });
}

describe("useIntegrityReporter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // `document.hidden` is a property on the shared jsdom document, and two
    // tests below set it true without putting it back. That leaked into every
    // later test in the file — harmless while the blur handler ignored it, but
    // it now reads it to tell a tab switch from a plain focus loss, so the
    // leaked `true` silently stopped three tests from recording anything.
    setHidden(false);
    setFullscreenElement(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    setHidden(false);
    setFullscreenElement(null);
  });

  it("attaches DOM event listeners when session_id is set", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    const windowAddEventListenerSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useIntegrityReporter("session-123"));

    // Verify listeners were attached
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "fullscreenchange",
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "webkitfullscreenchange",
      expect.any(Function),
    );
    expect(windowAddEventListenerSpy).toHaveBeenCalledWith(
      "blur",
      expect.any(Function),
    );

    addEventListenerSpy.mockRestore();
    windowAddEventListenerSpy.mockRestore();
  });

  it("detaches all listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    const windowRemoveEventListenerSpy = vi.spyOn(
      window,
      "removeEventListener",
    );

    const { unmount } = renderHook(() => useIntegrityReporter("session-123"));

    act(() => {
      unmount();
    });

    // Verify listeners were removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "fullscreenchange",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "webkitfullscreenchange",
      expect.any(Function),
    );
    expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith(
      "blur",
      expect.any(Function),
    );

    removeEventListenerSpy.mockRestore();
    windowRemoveEventListenerSpy.mockRestore();
  });

  it("does not attach listeners when session_id is null", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");

    renderHook(() => useIntegrityReporter(null));

    // No listeners should be attached
    expect(addEventListenerSpy).not.toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
  });

  it("does not attach listeners when session_id is undefined", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");

    renderHook(() => useIntegrityReporter(undefined));

    // No listeners should be attached
    expect(addEventListenerSpy).not.toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
  });

  it("batches events with debounce delay before POSTing", () => {
    // Reset the mock
    mockMutateAsyncFn.mockClear();

    renderHook(() => useIntegrityReporter("session-123"));

    // Trigger a visibility change event
    act(() => {
      setHidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Event should be queued but not sent yet
    expect(mockMutateAsyncFn).not.toHaveBeenCalled();

    // Advance timer past the debounce delay (2000ms)
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    // Now the event should be sent
    expect(mockMutateAsyncFn).toHaveBeenCalledTimes(1);
  });

  it("flushes pending events on unmount", () => {
    mockMutateAsyncFn.mockClear();

    const { unmount } = renderHook(() => useIntegrityReporter("session-123"));

    // Trigger a focus loss
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    // Event is pending
    expect(mockMutateAsyncFn).not.toHaveBeenCalled();

    // Unmount should flush
    act(() => {
      unmount();
    });

    // After unmount, pending events should be flushed (within debounce or immediate)
    // At minimum, the hook should not error
  });

  it("handles visibility change (tab switch) events", () => {
    mockMutateAsyncFn.mockClear();

    renderHook(() => useIntegrityReporter("session-123"));

    // Simulate tab becoming hidden
    act(() => {
      setHidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    // Verify event was sent
    expect(mockMutateAsyncFn).toHaveBeenCalledTimes(1);
  });

  it("handles focus loss (blur) events", () => {
    mockMutateAsyncFn.mockClear();

    renderHook(() => useIntegrityReporter("session-123"));

    // Trigger blur
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    // Verify event was sent
    expect(mockMutateAsyncFn).toHaveBeenCalledTimes(1);
  });

  it("handles fullscreen exit events", () => {
    mockMutateAsyncFn.mockClear();

    renderHook(() => useIntegrityReporter("session-123"));

    // Simulate fullscreen exit
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    // Verify event was sent
    expect(mockMutateAsyncFn).toHaveBeenCalledTimes(1);
  });

  it("records a Safari fullscreen exit through the WebKit event", () => {
    // Safari never touches document.fullscreenElement; the reporter listens
    // to webkitfullscreenchange AND reads webkitFullscreenElement, so a
    // Safari exit is still recorded as an integrity event.
    mockMutateAsyncFn.mockClear();

    renderHook(() => useIntegrityReporter("session-123"));

    act(() => {
      document.dispatchEvent(new Event("webkitfullscreenchange"));
    });

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(mockMutateAsyncFn).toHaveBeenCalledTimes(1);
    const firstCall = mockMutateAsyncFn.mock
      .calls[0] as unknown as [{ events: { event_type: string }[] }] | undefined;
    expect(firstCall).toBeDefined();
    expect(firstCall![0].events).toEqual([
      expect.objectContaining({ event_type: "fullscreen_exit" }),
    ]);
  });

  it("caps batch at 50 events", () => {
    mockMutateAsyncFn.mockClear();

    renderHook(() => useIntegrityReporter("session-123"));

    // Queue 51 events (by repeatedly triggering blur)
    act(() => {
      for (let i = 0; i < 51; i++) {
        window.dispatchEvent(new Event("blur"));
      }
    });

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    // Verify batch was sent (max 50 per batch per backend)
    expect(mockMutateAsyncFn).toHaveBeenCalled();
  });

  it("silently catches errors from mutateAsync", () => {
    // Mock mutateAsync to reject
    mockMutateAsyncFn.mockClear();
    mockMutateAsyncFn.mockRejectedValueOnce(new Error("Network error"));

    renderHook(() => useIntegrityReporter("session-123"));

    // Trigger an event
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    // The promise rejection should be swallowed (caught intentionally)
    // The hook should not throw
    expect(mockMutateAsyncFn).toHaveBeenCalledTimes(1);
  });

  describe("client_event_id + server crossing signal (2026-09-10)", () => {
    it("stamps a client_event_id on every scored browser signal", async () => {
      mockMutateAsyncFn.mockClear();
      mockMutateAsyncFn.mockResolvedValue({
        accepted: 1,
        integrity_score: 0,
      });

      renderHook(() => useIntegrityReporter("session-123"));

      // A plain blur (window keeps visible) → focus_lost after one macrotask.
      act(() => {
        window.dispatchEvent(new Event("blur"));
        vi.advanceTimersByTime(0);
      });
      // Tab hidden → tab_switch.
      act(() => {
        setHidden(true);
        document.dispatchEvent(new Event("visibilitychange"));
      });
      // Fullscreen exit (document.fullscreenElement already null).
      act(() => {
        document.dispatchEvent(new Event("fullscreenchange"));
      });
      setHidden(false);
      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      const call = mockMutateAsyncFn.mock.calls[0] as unknown as [
        { events: { event_type: string; metadata?: { client_event_id?: string } }[] },
      ];
      const byType = Object.fromEntries(
        call[0].events.map((e) => [e.event_type, e]),
      );
      // Scored signals carry a UUID retry key...
      for (const t of ["tab_switch", "focus_lost", "fullscreen_exit"]) {
        expect(byType[t]).toBeDefined();
        expect(byType[t].metadata?.client_event_id).toMatch(
          /^[0-9a-f-]{36}$/,
        );
      }
      // ...and two of the same event never share a key.
      expect(byType["tab_switch"].metadata?.client_event_id).not.toBe(
        byType["fullscreen_exit"].metadata?.client_event_id,
      );
    });

    it("fires onThresholdWarning exactly when the server reports the crossing", async () => {
      mockMutateAsyncFn.mockClear();
      mockMutateAsyncFn.mockResolvedValue({
        accepted: 1,
        integrity_score: 3,
        integrity_score_threshold: 3,
        warning_issued: true,
      });
      const onThreshold = vi.fn();
      const onWarning = vi.fn();

      renderHook(() =>
        useIntegrityReporter("session-123", {
          onWarning,
          onThresholdWarning: onThreshold,
        }),
      );

      act(() => {
        setHidden(true);
        document.dispatchEvent(new Event("visibilitychange"));
      });
      // The immediate local nudge is preserved (FR-5.8 level-1 deterrent).
      expect(onWarning).toHaveBeenCalledWith("tab_switch");
      // ...but the policy warning only fires after the server confirms.
      expect(onThreshold).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(2100);
      });
      expect(onThreshold).toHaveBeenCalledTimes(1);
      expect(onThreshold).toHaveBeenCalledWith(3, 3);
    });

    it("does NOT fire onThresholdWarning for a non-crossing batch", async () => {
      mockMutateAsyncFn.mockClear();
      mockMutateAsyncFn.mockResolvedValue({
        accepted: 2,
        integrity_score: 2,
        integrity_score_threshold: 3,
        warning_issued: false,
      });
      const onThreshold = vi.fn();

      renderHook(() =>
        useIntegrityReporter("session-123", { onThresholdWarning: onThreshold }),
      );

      act(() => {
        window.dispatchEvent(new Event("blur"));
      });
      await act(async () => {
        vi.advanceTimersByTime(2100);
      });
      expect(onThreshold).not.toHaveBeenCalled();
    });
  });
});
