import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useInterviewTimer } from "@/lib/interview/use-interview-timer";

/**
 * Audit P2 (stale timer): an inactive timer must not carry the previous
 * session's elapsed readout, and a new session's timestamp must REPLACE the
 * origin — a retry after a failed start used to display the dead session's
 * time.
 */

describe("useInterviewTimer reset semantics", () => {
  const T0 = 1_700_000_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it("resets seconds and origin when it goes inactive", async () => {
    const { result, rerender } = renderHook(
      ({ active, at }) => useInterviewTimer(active, at),
      { initialProps: { active: true, at: T0 as number | null } },
    );
    vi.setSystemTime(T0 + 300_000);
    rerender({ active: true, at: T0 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current).toBe("05:01"); // tick fired while advancing

    // Session ends → inactive: readout returns to zero, origin forgotten.
    rerender({ active: false, at: T0 });
    expect(result.current).toBe("00:00");

    // A later NEW session with no timestamp yet starts from zero, not 05:00.
    rerender({ active: true, at: null });
    expect(result.current).toBe("00:00");
  });

  it("a new session's timestamp replaces the stale origin", async () => {
    const { result, rerender } = renderHook(
      ({ active, at }) => useInterviewTimer(active, at),
      { initialProps: { active: true, at: T0 as number | null } },
    );
    vi.setSystemTime(T0 + 120_000);
    rerender({ active: true, at: T0 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current).toBe("02:01"); // tick fired while advancing

    // Retry succeeded: server stamps a fresh start (now) — the readout must
    // restart from the NEW origin, not keep the old session's 02:00.
    const T1 = T0 + 1_000_000;
    vi.setSystemTime(T1 + 5_000);
    rerender({ active: true, at: T1 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current).toBe("00:06"); // +1 tick while advancing
  });

  it("ticks while active", async () => {
    const { result } = renderHook(() => useInterviewTimer(true, T0));
    vi.setSystemTime(T0 + 60_000);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current).toBe("01:01");
  });
});
