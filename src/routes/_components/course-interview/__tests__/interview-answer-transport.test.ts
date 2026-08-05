import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleRespond } from "@/routes/_components/course-interview/interview-answer-actions";
import type { InterviewActionsContext } from "@/routes/_components/course-interview/types";

/**
 * The typed-answer transport branch of `handleRespond`.
 *
 * With the flag off, a submitted answer MUST go over REST `/respond` — that is
 * the production path today, and this feature must not disturb it. With the
 * flag on and a connected hybrid room, the same answer must go over `lk.chat`
 * (the hook's `sendTurn`), and the control event's `state` — which is the full
 * `InterviewSubmitAnswerResponse` — must drive the SAME `applyRespondResult`
 * lifecycle the REST path uses.
 *
 * The three failure modes the control stream can report (rejected / failed /
 * timed out) must keep the draft and NOT advance, exactly like a REST error.
 */

const QUESTION = { id: "11111111-1111-1111-1111-111111111111" };

/** A completed control event carrying a minimal but valid response body. */
function completedOutcome(overrides: Record<string, unknown> = {}) {
  return {
    event: {
      status: "completed",
      turnKey: "tk-1",
      seq: 3,
      turnAction: "answer",
      stateVersion: 4,
      rejection: null,
      errorClass: null,
      state: {
        is_finished: false,
        next_question: null,
        ai_followup_text: null,
        ai_turn_text: null,
        transition_text: null,
        transition_target: null,
        time_remaining_seconds: 540,
        should_finish: false,
        should_await_response: false,
        interaction_state: "answering",
        ...overrides,
      },
    },
    preserveDraft: false,
  };
}

function makeCtx(overrides: Record<string, unknown> = {}) {
  const ctx = {
    currentQuestion: QUESTION,
    sessionId: "00000000-0000-0000-0000-000000000001",
    chatBridge: { current: null },
    inputMode: "hybrid",
    onboardingStage: "completed",
    answer: { state: { status: "idle" } },
    respond: { isPending: false, mutateAsync: vi.fn() },
    dictation: { listening: false, stop: vi.fn() },
    answerText: "my answer",
    t: (key: string) => key,
    beginSubmit: vi.fn(),
    submitFailed: vi.fn(),
    setAnswerText: vi.fn(),
    setTranscript: vi.fn(),
    submitSucceeded: vi.fn(),
    clearDraftAutosave: vi.fn(),
    setRecentSubmission: vi.fn(),
    currentElapsedSeconds: () => 42,
    reconcileDeadline: vi.fn(),
    setPendingNextQuestion: vi.fn(),
    setPhase: vi.fn(),
    setPendingFinalTransition: vi.fn(),
    setClosingCeremonyActive: vi.fn(),
    reopenForFollowUp: vi.fn(),
    beginClosing: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return ctx as unknown as InterviewActionsContext;
}

function liveChat(sendTurnImpl?: () => Promise<unknown>) {
  return {
    sendTurn: vi.fn(
      sendTurnImpl ??
        (() =>
          Promise.resolve(completedOutcome()) as ReturnType<
            NonNullable<InterviewActionsContext["chatBridge"]["current"]>["sendTurn"]
          >),
    ),
    pending: false,
    canSend: true,
    connected: true,
    lastEvent: null,
  };
}

beforeEach(() => {
  vi.stubEnv("VITE_INTERVIEW_LK_TEXT", "1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("handleRespond transport", () => {
  it("uses REST when the flag is off, even with a connected room", async () => {
    vi.stubEnv("VITE_INTERVIEW_LK_TEXT", "0");
    const respond = { isPending: false, mutateAsync: vi.fn().mockResolvedValue({}) };
    const chat = liveChat();
    const ctx = makeCtx({
      respond,
      chatBridge: { current: chat },
    });

    await handleRespond(ctx);

    expect(respond.mutateAsync).toHaveBeenCalledTimes(1);
    expect(
      (respond.mutateAsync as unknown as { mock: { calls: unknown[][] } }).mock
        .calls[0][0],
    ).toMatchObject({
      session_question_id: QUESTION.id,
      answer_text: "my answer",
      turn_action: "answer",
    });
    expect(chat.sendTurn).not.toHaveBeenCalled();
  });

  it("uses REST when the room is not connected, even with the flag on", async () => {
    const respond = { isPending: false, mutateAsync: vi.fn().mockResolvedValue({}) };
    const chat = liveChat();
    const ctx = makeCtx({
      respond,
      chatBridge: { current: { ...chat, connected: false, canSend: false } },
    });

    await handleRespond(ctx);

    expect(respond.mutateAsync).toHaveBeenCalledTimes(1);
    expect(chat.sendTurn).not.toHaveBeenCalled();
  });

  it("sends the answer over lk.chat when the live transport is active", async () => {
    const respond = { isPending: false, mutateAsync: vi.fn() };
    const chat = liveChat();
    const ctx = makeCtx({ respond, chatBridge: { current: chat } });

    await handleRespond(ctx);

    expect(chat.sendTurn).toHaveBeenCalledTimes(1);
    expect(
      (chat.sendTurn as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0],
    ).toMatchObject({
      text: "my answer",
      turnAction: "answer",
      turnKey: expect.any(String),
    });
    // The REST mutation must NOT be touched on the live path.
    expect(respond.mutateAsync).not.toHaveBeenCalled();
  });

  it("runs the same applyRespondResult lifecycle from the control event state", async () => {
    const chat = liveChat();
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleRespond(ctx);

    // The answer is committed to the transcript exactly once (deduped by the
    // submission id), with the response's authoritative deadline re-anchored.
    expect(ctx.submitSucceeded).toHaveBeenCalledTimes(1);
    expect(ctx.reconcileDeadline).toHaveBeenCalledWith(540);
    expect(ctx.setTranscript).toHaveBeenCalledTimes(1);
  });

  it("preserves the draft and does not advance on a rejection", async () => {
    const chat = liveChat(() =>
      Promise.resolve({
        event: {
          status: "rejected",
          turnKey: "tk-1",
          seq: 2,
          turnAction: "answer",
          stateVersion: null,
          rejection: "turn_in_flight",
          errorClass: null,
          state: null,
        },
        preserveDraft: true,
      }),
    );
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleRespond(ctx);

    expect(ctx.submitFailed).toHaveBeenCalledWith(
      "course_interview.errors.turn_in_flight",
    );
    expect(ctx.setAnswerText).toHaveBeenCalledWith("my answer");
    expect(ctx.setTranscript).not.toHaveBeenCalled();
    expect(ctx.reconcileDeadline).not.toHaveBeenCalled();
  });

  it("preserves the draft on a control timeout (ambiguous outcome)", async () => {
    const chat = liveChat(() =>
      Promise.resolve({
        event: {
          status: "failed",
          turnKey: "tk-1",
          seq: -1,
          turnAction: "answer",
          stateVersion: null,
          rejection: null,
          errorClass: "ControlTimeout",
          state: null,
        },
        preserveDraft: true,
      }),
    );
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleRespond(ctx);

    expect(ctx.submitFailed).toHaveBeenCalledWith(
      "course_interview.errors.send_failed_livekit",
    );
    expect(ctx.setAnswerText).toHaveBeenCalledWith("my answer");
    expect(ctx.setTranscript).not.toHaveBeenCalled();
  });

  it("uses REST for a session that has not finished onboarding", async () => {
    const respond = { isPending: false, mutateAsync: vi.fn().mockResolvedValue({}) };
    const chat = liveChat();
    const ctx = makeCtx({
      respond,
      onboardingStage: "preparation",
      chatBridge: { current: chat },
    });

    await handleRespond(ctx);

    expect(respond.mutateAsync).toHaveBeenCalledTimes(1);
    expect(chat.sendTurn).not.toHaveBeenCalled();
  });
});
