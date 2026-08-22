import { describe, expect, it, vi } from "vitest";

import { handleRespond } from "@/routes/courses/_components/course-interview/interview-answer-actions";
import type { InterviewActionsContext } from "@/routes/courses/_components/course-interview/types";

/**
 * The typed-answer lifecycle of `handleRespond`.
 *
 * There is ONE transport. A submitted answer goes over `lk.chat` (the hook's
 * `sendTurn`) and is settled by the agent's ack on the control topic. The ack
 * carries no state — everything the UI derives from an answer (next question,
 * countdown, finished) arrives later as a session snapshot — so this suite pins
 * what the ack itself must do: commit the turn exactly once, clear the composer,
 * and never call the REST `/respond` mutation, which no longer exists on this
 * path.
 *
 * The two refusal modes (rejected / failed) must keep the draft and NOT advance.
 */

const QUESTION = { id: "11111111-1111-1111-1111-111111111111" };

/** The agent's ack: received and being worked on, with no structured result. */
function acceptedOutcome() {
  return {
    event: {
      status: "accepted",
      turnKey: "tk-1",
      seq: 3,
      turnAction: "answer",
      stateVersion: null,
      rejection: null,
      errorClass: null,
      state: null,
      snapshot: null,
    },
    preserveDraft: false,
  };
}

function refusedOutcome(over: Record<string, unknown> = {}) {
  return {
    event: {
      status: "rejected",
      turnKey: "tk-1",
      seq: 2,
      turnAction: "answer",
      stateVersion: null,
      rejection: "turn_in_flight",
      errorClass: null,
      state: null,
      snapshot: null,
      ...over,
    },
    preserveDraft: true,
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
    reopenForFollowUp: vi.fn(),
    currentElapsedSeconds: () => 42,
    reconcileDeadline: vi.fn(),
    setPendingNextQuestion: vi.fn(),
    setPhase: vi.fn(),
    setSessionProgress: vi.fn(),
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
          Promise.resolve(acceptedOutcome()) as ReturnType<
            NonNullable<InterviewActionsContext["chatBridge"]["current"]>["sendTurn"]
          >),
    ),
    pending: false,
    canSend: true,
    connected: true,
    lastEvent: null,
    snapshot: null,
  };
}

function calls(fn: unknown): unknown[][] {
  return (fn as { mock: { calls: unknown[][] } }).mock.calls;
}

describe("handleRespond over lk.chat", () => {
  it("sends the answer on lk.chat with the answer action and a turn key", async () => {
    const chat = liveChat();
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleRespond(ctx);

    expect(chat.sendTurn).toHaveBeenCalledTimes(1);
    expect(calls(chat.sendTurn)[0][0]).toMatchObject({
      text: "my answer",
      turnAction: "answer",
      turnKey: expect.any(String),
    });
  });

  it("commits the turn on `accepted`, without waiting for grading", async () => {
    // The ack is the only acknowledgement a streaming turn gets. The answer lands
    // in the transcript, the composer clears, and the autosaved draft is dropped —
    // all on "the agent has your text", never on "your answer has been graded".
    const chat = liveChat();
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleRespond(ctx);

    expect(ctx.submitSucceeded).toHaveBeenCalledTimes(1);
    expect(ctx.setTranscript).toHaveBeenCalledTimes(1);
    expect(ctx.clearDraftAutosave).toHaveBeenCalledTimes(1);
    expect(ctx.setAnswerText).toHaveBeenCalledWith("");
    expect(ctx.setRecentSubmission).toHaveBeenCalledWith({
      answer: "my answer",
      questionId: QUESTION.id,
      submissionId: expect.any(String),
    });
  });

  it("reuses one id as the transcript key and the wire turn_key", async () => {
    // A retry reuses it, so neither the client transcript nor the agent can end up
    // with the answer twice.
    const chat = liveChat();
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleRespond(ctx, undefined, { retrySubmissionId: "tk-retry-1234" });

    expect(calls(chat.sendTurn)[0][0]).toMatchObject({
      turnKey: "tk-retry-1234",
    });
    expect(ctx.setRecentSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ submissionId: "tk-retry-1234" }),
    );
  });

  it("reopens the answer for a follow-up on the same question", async () => {
    // `submitted` locks the composer until a NEW question arrives, but the native
    // agent often probes further on THIS one — no tool call, so no snapshot and
    // nothing else would ever unlock it.
    const chat = liveChat();
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleRespond(ctx);

    expect(ctx.reopenForFollowUp).toHaveBeenCalledTimes(1);
  });

  it("derives no session state from the ack", async () => {
    // Deliberate: the deadline, the next question and the finished flag are all
    // snapshot-driven now. Reading them from a turn result is what froze the UI
    // when the native agent stopped sending one.
    const chat = liveChat();
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleRespond(ctx);

    expect(ctx.reconcileDeadline).not.toHaveBeenCalled();
    expect(ctx.setPendingNextQuestion).not.toHaveBeenCalled();
    expect(ctx.setPhase).not.toHaveBeenCalled();
    expect(ctx.beginClosing).not.toHaveBeenCalled();
  });

  it("preserves the draft and does not advance on a rejection", async () => {
    const chat = liveChat(() => Promise.resolve(refusedOutcome()));
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleRespond(ctx);

    expect(ctx.submitFailed).toHaveBeenCalledWith(
      "course_interview.errors.turn_in_flight",
    );
    expect(ctx.setAnswerText).toHaveBeenCalledWith("my answer");
    expect(ctx.setTranscript).not.toHaveBeenCalled();
    expect(ctx.reconcileDeadline).not.toHaveBeenCalled();
  });

  it("preserves the draft when the room drops mid-turn", async () => {
    // With no timeout left, this is the ambiguous-outcome case: the turn may or
    // may not have reached the agent, so the text goes back in the composer and a
    // retry reuses the same turn_key.
    const chat = liveChat(() =>
      Promise.resolve(
        refusedOutcome({
          status: "failed",
          rejection: null,
          errorClass: "RoomDisconnected",
          seq: -1,
        }),
      ),
    );
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleRespond(ctx);

    expect(ctx.submitFailed).toHaveBeenCalledWith(
      // A RoomDisconnected turn was cut off BEFORE reaching the agent, so it
      // was definitely not graded — the message says so, or the candidate
      // fears a double-submit and stops retrying.
      "course_interview.errors.room_disconnected",
    );
    expect(ctx.setAnswerText).toHaveBeenCalledWith("my answer");
    expect(ctx.setTranscript).not.toHaveBeenCalled();
  });

  it("reports a failure rather than sending when there is no room", async () => {
    // There is no second door: without a bridge the turn cannot go anywhere, and
    // failing loudly beats a composer that silently does nothing.
    const ctx = makeCtx({ chatBridge: { current: null } });

    await handleRespond(ctx);

    expect(ctx.beginSubmit).not.toHaveBeenCalled();
    expect(ctx.setTranscript).not.toHaveBeenCalled();
  });

  it("refuses a second submit while a turn is pending", async () => {
    const chat = { ...liveChat(), pending: true };
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleRespond(ctx);

    expect(chat.sendTurn).not.toHaveBeenCalled();
    expect(ctx.beginSubmit).not.toHaveBeenCalled();
  });

  it("refuses a second submit while the answer is already acknowledged", async () => {
    const chat = liveChat();
    const ctx = makeCtx({
      chatBridge: { current: chat },
      answer: { state: { status: "submitted" } },
    });

    await handleRespond(ctx);

    expect(chat.sendTurn).not.toHaveBeenCalled();
  });
});
