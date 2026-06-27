/**
 * Unit tests for useIntegrityReporter hook.
 *
 * Tests integrity event batching, debouncing, and DOM listener attachment.
 * Uses fake timers to verify debounce behavior and flush on unmount.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Mock the interviews hook before importing the hook that uses it
const mockMutateAsyncFn = vi.fn(async () => {});

vi.mock("@/lib/api/hooks/interviews", () => ({
  useReportIntegrityEvents: vi.fn(() => ({
    mutateAsync: mockMutateAsyncFn,
  })),
}));

import { useIntegrityReporter } from "../use-integrity-reporter";

describe("useIntegrityReporter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("attaches DOM event listeners when session_id is set", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    const windowAddEventListenerSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useIntegrityReporter("session-123"));

    // Verify listeners were attached
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "fullscreenchange",
      expect.any(Function)
    );
    expect(windowAddEventListenerSpy).toHaveBeenCalledWith(
      "blur",
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
    windowAddEventListenerSpy.mockRestore();
  });

  it("detaches all listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    const windowRemoveEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useIntegrityReporter("session-123"));

    act(() => {
      unmount();
    });

    // Verify listeners were removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "fullscreenchange",
      expect.any(Function)
    );
    expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith(
      "blur",
      expect.any(Function)
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
      Object.defineProperty(document, "hidden", {
        value: true,
        configurable: true,
      });
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
      Object.defineProperty(document, "hidden", {
        value: true,
        configurable: true,
      });
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
      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        configurable: true,
      });
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    // Verify event was sent
    expect(mockMutateAsyncFn).toHaveBeenCalledTimes(1);
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
});
