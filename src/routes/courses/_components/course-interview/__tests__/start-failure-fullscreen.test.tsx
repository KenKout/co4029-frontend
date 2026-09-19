import { describe, expect, it, vi } from "vitest";

import { beginSessionAfterFullscreen } from "@/routes/courses/_components/course-interview/interview-start-actions";
import type { InterviewActionsContext } from "@/routes/courses/_components/course-interview/types";

/**
 * Audit P1 (start/retry failure leaves the UI fullscreen): a start mutation
 * that fails AFTER fullscreen was granted must exit fullscreen
 * INTENTIONALLY (so it is not logged as an integrity violation) and rethrow
 * for the caller's error surface. A fullscreen refusal must never reach the
 * start API at all.
 */

function makeCtx(overrides?: {
  granted?: boolean;
  failStart?: boolean;
}): {
  ctx: InterviewActionsContext;
  startFn: () => Promise<void>;
  exitFn: ReturnType<typeof vi.fn>;
} {
  const exitFn = vi.fn().mockResolvedValue(undefined);
  const startFn: () => Promise<void> = vi.fn().mockImplementation(async () => {
    if (overrides?.failStart) throw new Error("start failed");
  });
  const ctx = {
    startInFlightRef: { current: false },
    fullscreenGate: {
      enter: vi.fn().mockResolvedValue(overrides?.granted ?? true),
      isFullscreenNow: vi.fn().mockReturnValue(overrides?.granted ?? true),
      exit: exitFn,
    },
    startSession: { isPending: false },
  } as unknown as InterviewActionsContext;
  return { ctx, startFn, exitFn };
}

describe("beginSessionAfterFullscreen failure semantics", () => {
  it("exits fullscreen intentionally when the start call fails", async () => {
    const { ctx, startFn, exitFn } = makeCtx({ failStart: true });
    await expect(beginSessionAfterFullscreen(ctx, startFn)).rejects.toThrow(
      "start failed",
    );
    expect(startFn).toHaveBeenCalledTimes(1);
    expect(exitFn).toHaveBeenCalledWith(true);
  });

  it("never calls start when fullscreen is not granted", async () => {
    const { ctx, startFn, exitFn } = makeCtx({ granted: false });
    await beginSessionAfterFullscreen(ctx, startFn);
    expect(startFn).not.toHaveBeenCalled();
    expect(exitFn).not.toHaveBeenCalled();
  });

  it("does not exit fullscreen when the start succeeds", async () => {
    const { ctx, startFn, exitFn } = makeCtx({ failStart: false });
    await beginSessionAfterFullscreen(ctx, startFn);
    expect(startFn).toHaveBeenCalledTimes(1);
    expect(exitFn).not.toHaveBeenCalled();
  });
});
