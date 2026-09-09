import { describe, expect, it, vi } from "vitest";

import {
  beginSessionAfterFullscreen,
  handleRetry,
  handleStart,
} from "@/routes/courses/_components/course-interview/interview-start-actions";
import type { InterviewActionsContext } from "@/routes/courses/_components/course-interview/types";

/**
 * The ONE start/resume/retry sequencing and the auto-resume contract.
 *
 * Fullscreen is a mandatory gate: `beginSessionAfterFullscreen` awaits
 * `fullscreenGate.enter()` (a user gesture is required, so this must run
 * inside the click handler), re-checks the DOM, and only then calls the start
 * mutation. A denied/unsupported request must produce ZERO mutations and must
 * leave the caller's screen state untouched.
 */

function makeCtx(overrides: Record<string, unknown> = {}) {
  const enter = vi.fn(() => Promise.resolve(true));
  const ctx = {
    startSession: { mutateAsync: vi.fn(), isPending: false },
    fullscreenGate: {
      enter,
      isFullscreenNow: vi.fn(() => true),
      isFullscreen: false,
    },
    startInFlightRef: { current: false },
    t: (key: string) => key,
    i18n: { language: "vi", changeLanguage: vi.fn(() => Promise.resolve()) },
    interviewLanguage: "vi",
    sessionStartedAtRef: { current: null },
    timeoutTriggeredRef: { current: false },
    setPhase: vi.fn(),
    setSessionId: vi.fn(),
    setTranscript: vi.fn(),
    setCurrentQuestion: vi.fn(),
    setFinishResult: vi.fn(),
    setPendingFinishResult: vi.fn(),
    setPendingFirstQuestion: vi.fn(),
    setPendingNextQuestion: vi.fn(),
    setAssessmentStartedAtMs: vi.fn(),
    setSessionDeadlineAt: vi.fn(),
    setAnswerText: vi.fn(),
    setVoiceOn: vi.fn(),
    setTranscriptOpen: vi.fn(),
    setConnected: vi.fn(),
    setOnboardingStage: vi.fn(),
    setInterviewLanguage: vi.fn(),
    setPendingFirstQuestionUnused: undefined,
    ...overrides,
  };
  return { ctx: ctx as unknown as InterviewActionsContext, enter };
}

/** A start payload that lands in questioning with a timed assessment. */
function startPayload(over: Record<string, unknown> = {}) {
  return {
    session_id: "00000000-0000-0000-0000-00000000abcd",
    onboarding_stage: "completed",
    interview_language: "vi",
    assessment_started_at: "2026-09-09T10:00:00Z",
    time_remaining_seconds: 600,
    first_question: { id: "11111111-1111-1111-1111-111111111111" },
    history: [],
    ...over,
  };
}

describe("beginSessionAfterFullscreen", () => {
  it("requests fullscreen BEFORE calling the start mutation", async () => {
    const order: string[] = [];
    const { ctx, enter } = makeCtx({
      startSession: {
        mutateAsync: vi.fn(() => {
          order.push("mutate");
          return Promise.resolve(startPayload());
        }),
        isPending: false,
      },
    });
    enter.mockImplementation(() => {
      order.push("enter");
      return Promise.resolve(true);
    });

    await handleStart(ctx);

    expect(order).toEqual(["enter", "mutate"]);
    expect(ctx.startSession.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("issues ZERO mutations when the fullscreen request is denied", async () => {
    const { ctx, enter } = makeCtx();
    enter.mockImplementation(() => Promise.resolve(false));

    await handleStart(ctx);

    expect(ctx.startSession.mutateAsync).not.toHaveBeenCalled();
    // The screen state is untouched: still the lobby.
    expect(ctx.setSessionId).not.toHaveBeenCalled();
    expect(ctx.setPhase).not.toHaveBeenCalled();
  });

  it("issues ZERO mutations when unsupported", async () => {
    const { ctx, enter } = makeCtx();
    enter.mockImplementation(() => Promise.resolve(false));
    (
      ctx.fullscreenGate as unknown as {
        isFullscreenNow: ReturnType<typeof vi.fn>;
      }
    ).isFullscreenNow.mockImplementation(() => false);

    await handleStart(ctx);

    expect(ctx.startSession.mutateAsync).not.toHaveBeenCalled();
  });

  it("re-checks the DOM after the grant and refuses on a lagging state", async () => {
    // Promise resolved, but the element never landed in the DOM: not granted.
    const { ctx, enter } = makeCtx();
    enter.mockImplementation(() => Promise.resolve(true));
    (
      ctx.fullscreenGate as unknown as {
        isFullscreenNow: ReturnType<typeof vi.fn>;
      }
    ).isFullscreenNow.mockImplementation(() => false);

    await handleStart(ctx);

    expect(ctx.startSession.mutateAsync).not.toHaveBeenCalled();
  });

  it("blocks a second concurrent start behind the in-flight ref", async () => {
    // The first call's enter() is still pending when the second fires.
    let release!: (value: boolean) => void;
    const gate = new Promise<boolean>((resolve) => (release = resolve));
    const mutateAsync = vi.fn(() => Promise.resolve(startPayload()));
    const { ctx, enter } = makeCtx({
      startSession: { mutateAsync, isPending: false },
    });
    enter.mockImplementation(() => {
      return gate;
    });

    const first = handleStart(ctx);
    const second = handleStart(ctx);
    release(true);
    await Promise.all([first, second]);

    expect(enter).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("commits the session only after the mutation resolves", async () => {
    const { ctx } = makeCtx({
      startSession: {
        mutateAsync: vi.fn(() => Promise.resolve(startPayload())),
        isPending: false,
      },
    });

    await handleStart(ctx);

    expect(ctx.setSessionId).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-00000000abcd",
    );
    expect(ctx.setPhase).toHaveBeenCalledWith("questioning");
    // The graded anchor comes from the SERVER timestamp, not Date.now().
    expect(ctx.setAssessmentStartedAtMs).toHaveBeenCalledWith(
      new Date("2026-09-09T10:00:00Z").getTime(),
    );
  });

  it("keeps the caller's screen on a start-API failure after a grant", async () => {
    // Fullscreen was granted, then the API failed: the lobby must come back
    // (no half-created session state) and the error is reported, not thrown.
    const { ctx } = makeCtx({
      startSession: {
        mutateAsync: vi.fn(() => Promise.reject(new Error("boom"))),
        isPending: false,
      },
    });

    await expect(handleStart(ctx)).resolves.toBeUndefined();
    expect(ctx.setSessionId).not.toHaveBeenCalled();
    expect(ctx.setPhase).not.toHaveBeenCalled();
  });
});

describe("handleRetry sequencing", () => {
  it("does NOT clear the results screen when fullscreen is refused", async () => {
    const { ctx, enter } = makeCtx({
      startSession: { mutateAsync: vi.fn(), isPending: false },
    });
    enter.mockImplementation(() => Promise.resolve(false));

    await handleRetry(ctx);

    expect(ctx.setFinishResult).not.toHaveBeenCalled();
    expect(ctx.setTranscript).not.toHaveBeenCalled();
    expect(ctx.setSessionId).not.toHaveBeenCalled();
    expect(ctx.startSession.mutateAsync).not.toHaveBeenCalled();
  });

  it("clears the result only after the grant, then starts fresh", async () => {
    const order: string[] = [];
    const { ctx, enter } = makeCtx({
      startSession: {
        mutateAsync: vi.fn(() => {
          order.push("mutate");
          return Promise.resolve(startPayload());
        }),
        isPending: false,
      },
    });
    enter.mockImplementation(() => {
      order.push("enter");
      return Promise.resolve(true);
    });
    (ctx as unknown as { setFinishResult: ReturnType<typeof vi.fn> })
      .setFinishResult.mockImplementation(() => order.push("reset"));

    await handleRetry(ctx);

    expect(order).toEqual(["enter", "reset", "mutate"]);
    expect(ctx.setPhase).toHaveBeenCalledWith("questioning");
  });

  it("refuses a retry while the start mutation is already pending", async () => {
    const { ctx, enter } = makeCtx({
      startSession: { mutateAsync: vi.fn(), isPending: true },
    });

    await handleRetry(ctx);

    expect(enter).not.toHaveBeenCalled();
    expect(ctx.startSession.mutateAsync).not.toHaveBeenCalled();
  });
});

describe("beginSessionAfterFullscreen contract", () => {
  it("releases the in-flight guard even when the gate throws", async () => {
    const { ctx, enter } = makeCtx();
    enter.mockImplementation(() => Promise.reject(new Error("browser blew up")));

    await expect(
      beginSessionAfterFullscreen(ctx, () => Promise.resolve()),
    ).rejects.toThrow("browser blew up");

    expect(ctx.startInFlightRef.current).toBe(false);
  });
});
