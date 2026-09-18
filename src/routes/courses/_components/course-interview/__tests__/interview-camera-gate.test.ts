import { describe, expect, it, vi } from "vitest";

import {
  beginSessionAfterCamera,
  handleRetry,
  handleStart,
} from "@/routes/courses/_components/course-interview/interview-start-actions";
import type { InterviewActionsContext } from "@/routes/courses/_components/course-interview/types";
import type { InterviewCameraController } from "@/lib/quiz/use-quiz-camera";

/**
 * The interview camera gate (FE-only, pre-start enforcement).
 *
 * Ordering contract, mirroring the mandatory fullscreen gate it sits beside:
 * the camera gate runs FIRST (a denied browser prompt must not cost a
 * fullscreen flicker), then fullscreen, then — and only then — the start
 * mutation. A denied/unsupported camera produces ZERO mutations and leaves
 * the caller's screen state untouched. The toast belongs to the LOBBY error
 * banner, so the gate itself never toasts.
 */

function makeCamera(
  overrides: Partial<InterviewCameraController> = {},
): InterviewCameraController {
  return {
    required: true,
    active: false,
    checking: false,
    error: null,
    stream: null,
    ensureActive: vi.fn(() => Promise.resolve(false)),
    retry: vi.fn(() => Promise.resolve(false)),
    stop: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
}

function makeCtx(
  overrides: Record<string, unknown> = {},
): {
  ctx: InterviewActionsContext;
  enter: ReturnType<typeof vi.fn>;
  camera: InterviewCameraController;
} {
  const enter = vi.fn(() => Promise.resolve(true));
  const camera = makeCamera();
  const ctx = {
    startSession: { mutateAsync: vi.fn(), isPending: false },
    fullscreenGate: {
      enter,
      isFullscreenNow: vi.fn(() => true),
      isFullscreen: false,
    },
    cameraGate: camera,
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
    ...overrides,
  };
  return {
    ctx: ctx as unknown as InterviewActionsContext,
    enter,
    camera,
  };
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

describe("interview camera gate (pre-start)", () => {
  it("orders camera → fullscreen → start mutation on handleStart", async () => {
    const order: string[] = [];
    const { ctx, enter, camera } = makeCtx();
    const mutateAsync = vi.fn(() => {
      order.push("mutate");
      return Promise.resolve(startPayload());
    });
    (
      ctx.startSession as unknown as { mutateAsync: typeof mutateAsync }
    ).mutateAsync = mutateAsync;
    camera.ensureActive = vi.fn(() => {
      order.push("camera");
      return Promise.resolve(true);
    });
    enter.mockImplementation(() => {
      order.push("enter");
      return Promise.resolve(true);
    });

    await handleStart(ctx);

    expect(order).toEqual(["camera", "enter", "mutate"]);
  });

  it("issues ZERO mutations and no fullscreen request when the camera is denied", async () => {
    const { ctx, enter, camera } = makeCtx();
    const mutateAsync = vi.fn();
    (
      ctx.startSession as unknown as { mutateAsync: typeof mutateAsync }
    ).mutateAsync = mutateAsync;
    camera.ensureActive = vi.fn(() => Promise.resolve(false));

    await handleStart(ctx);

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(enter).not.toHaveBeenCalled();
    expect(ctx.setSessionId).not.toHaveBeenCalled();
    expect(ctx.setPhase).not.toHaveBeenCalled();
  });

  it("refuses handleRetry too (results-screen path)", async () => {
    const { ctx, camera } = makeCtx();
    const mutateAsync = vi.fn();
    (
      ctx.startSession as unknown as { mutateAsync: typeof mutateAsync }
    ).mutateAsync = mutateAsync;
    camera.ensureActive = vi.fn(() => Promise.resolve(false));

    await handleRetry(ctx);

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(ctx.setSessionId).not.toHaveBeenCalled();
  });

  it("clears a stale camera error before asking again", async () => {
    const { ctx, camera } = makeCtx();
    const mutateAsync = vi.fn(() => Promise.resolve(startPayload()));
    (
      ctx.startSession as unknown as { mutateAsync: typeof mutateAsync }
    ).mutateAsync = mutateAsync;
    camera.error = "camera-unavailable";
    camera.ensureActive = vi.fn(() => Promise.resolve(true));

    await handleStart(ctx);

    expect(camera.clearError).toHaveBeenCalledTimes(1);
  });

  it("does not skip the gate when the controller reports an active stream but required", async () => {
    // ensureActive is the single authority: even with active=true the gate
    // must call it (the hook's ensureActive short-circuits on a live track —
    // no second prompt). This pins the delegation instead of a copy.
    const { ctx } = makeCtx();
    const mutateAsync = vi.fn(() => Promise.resolve(startPayload()));
    (
      ctx.startSession as unknown as { mutateAsync: typeof mutateAsync }
    ).mutateAsync = mutateAsync;
    const { cameraGate: camera } = ctx as unknown as {
      cameraGate: InterviewCameraController;
    };
    let ensured = false;
    camera.ensureActive = vi.fn(() => {
      ensured = true;
      return Promise.resolve(true);
    });

    await handleStart(ctx);

    expect(ensured).toBe(true);
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("beginSessionAfterCamera exists and sequences both gates", async () => {
    expect(typeof beginSessionAfterCamera).toBe("function");

    const order: string[] = [];
    const { ctx, enter, camera } = makeCtx();
    camera.ensureActive = vi.fn(() => {
      order.push("camera");
      return Promise.resolve(true);
    });
    enter.mockImplementation(() => {
      order.push("enter");
      return Promise.resolve(true);
    });

    let ran = false;
    await beginSessionAfterCamera(ctx, async () => {
      ran = true;
    });

    expect(order).toEqual(["camera", "enter"]);
    expect(ran).toBe(true);
  });

  it("beginSessionAfterCamera refuses the whole sequence when the camera is denied", async () => {
    const { ctx } = makeCtx();
    const { cameraGate: camera } = ctx as unknown as {
      cameraGate: InterviewCameraController;
    };
    camera.ensureActive = vi.fn(() => Promise.resolve(false));

    let ran = false;
    await beginSessionAfterCamera(ctx, async () => {
      ran = true;
    });

    expect(ran).toBe(false);
  });
});
