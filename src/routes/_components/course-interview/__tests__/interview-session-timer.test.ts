import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useInterviewTimeout } from "@/routes/_components/course-interview/use-interview-sequencing";
import type { InterviewBase } from "@/routes/_components/course-interview/types";

/**
 * The session auto-close timer, and the two ways it used to die quietly.
 *
 * 1. The deadline was a REF, so it could not appear in the effect's dependency
 *    array and a mid-session reconciliation never rescheduled the pending
 *    `setTimeout`. It landed only on the next phase change, which on the happy
 *    path was the `questioning ⇄ transition` flip — so it worked by accident.
 *    Snapshots arrive independently of phase, which turns that into a real
 *    dead-timer bug.
 *
 * 2. A null deadline is indistinguishable from "the backend stopped telling us",
 *    which is why the wire now carries `has_time_limit` and the reconciler takes
 *    it rather than inferring it.
 */

function makeBase(over: Partial<InterviewBase> = {}) {
  return {
    sessionId: "s-1",
    phase: "questioning",
    sessionDeadlineAt: null,
    timeoutTriggeredRef: { current: false },
    setVoiceActive: vi.fn(),
    ...over,
  } as unknown as InterviewBase;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useInterviewTimeout", () => {
  it("arms nothing for an untimed session", async () => {
    // `has_time_limit: false` reaches here as a null deadline. No timer, ever —
    // and critically, no synthesised one either.
    const beginClosing = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useInterviewTimeout(makeBase({ sessionDeadlineAt: null }), beginClosing),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 60_000);
    });

    expect(beginClosing).not.toHaveBeenCalled();
  });

  it("closes the interview when a real deadline passes", async () => {
    const beginClosing = vi.fn().mockResolvedValue(undefined);
    const base = makeBase({ sessionDeadlineAt: Date.now() + 60_000 });
    renderHook(() => useInterviewTimeout(base, beginClosing));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_000);
    });
    expect(beginClosing).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(beginClosing).toHaveBeenCalledWith("timed_out");
  });

  it("reschedules on a mid-session reconcile, with no phase change", async () => {
    // The R1 regression test. The deadline moves out by a snapshot while the phase
    // stays `questioning`; the old timer must be cancelled and a new one armed
    // against the new value.
    const beginClosing = vi.fn().mockResolvedValue(undefined);
    const timeoutTriggeredRef = { current: false };
    const start = Date.now();
    const { rerender } = renderHook(
      ({ deadline }: { deadline: number | null }) =>
        useInterviewTimeout(
          makeBase({ sessionDeadlineAt: deadline, timeoutTriggeredRef }),
          beginClosing,
        ),
      { initialProps: { deadline: start + 30_000 } },
    );

    rerender({ deadline: start + 600_000 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    // Would have fired at +30s on the stale timer.
    expect(beginClosing).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600_000);
    });
    expect(beginClosing).toHaveBeenCalledTimes(1);
  });

  it("disarms when a reconcile clears the deadline", async () => {
    // A timed session the agent then reports as untimed (config change, or the
    // limit lifted): the pending timer must go, not survive as a stale one.
    const beginClosing = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ deadline }: { deadline: number | null }) =>
        useInterviewTimeout(
          makeBase({ sessionDeadlineAt: deadline }),
          beginClosing,
        ),
      { initialProps: { deadline: Date.now() + 30_000 } as { deadline: number | null } },
    );

    rerender({ deadline: null });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });
    expect(beginClosing).not.toHaveBeenCalled();
  });

  it("fires immediately for a deadline already in the past", async () => {
    // A rejoin can land after the limit expired; the snapshot then carries 0.
    const beginClosing = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useInterviewTimeout(
        makeBase({ sessionDeadlineAt: Date.now() - 1_000 }),
        beginClosing,
      ),
    );

    expect(beginClosing).toHaveBeenCalledWith("timed_out");
  });

  it("stays out of the way once the interview is closing", async () => {
    const beginClosing = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useInterviewTimeout(
        makeBase({ phase: "closing", sessionDeadlineAt: Date.now() - 1_000 }),
        beginClosing,
      ),
    );

    expect(beginClosing).not.toHaveBeenCalled();
  });
});
