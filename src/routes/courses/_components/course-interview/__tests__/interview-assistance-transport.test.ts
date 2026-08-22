import { describe, expect, it, vi } from "vitest";

import {
  CANCEL_END_REPLY,
  CONFIRM_END_REPLY,
} from "@/lib/interview/end-confirmation";
import {
  handleAssistance,
  handleEndCancel,
  handleEndConfirm,
} from "@/routes/courses/_components/course-interview/interview-assistance-actions";
import type { InterviewActionsContext } from "@/routes/courses/_components/course-interview/types";

/**
 * Assistance turns and the end-confirmation replies, on the same `lk.chat` door
 * as answers.
 *
 * These POSTed `/respond` until now, which let the stateless REST brain mutate DB
 * state that the agent's snapshot then reported back as authoritative — the one
 * half-migration that must not exist. The backend honours `turn_action` on the
 * wire: `hint` is routed to the server's hint-ladder tool, and
 * `clarify` / `explain_term` / `repeat` are framed as help requests so they are
 * NOT graded as answers.
 */

const QUESTION = { id: "11111111-1111-1111-1111-111111111111" };

function ackOutcome() {
  return {
    event: {
      status: "accepted",
      turnKey: "tk-1",
      seq: 1,
      turnAction: "hint",
      stateVersion: null,
      rejection: null,
      errorClass: null,
      state: null,
      snapshot: null,
    },
    preserveDraft: false,
  };
}

function refusedOutcome() {
  return {
    event: {
      status: "rejected",
      turnKey: "tk-1",
      seq: 1,
      turnAction: "hint",
      stateVersion: null,
      rejection: "turn_in_flight",
      errorClass: null,
      state: null,
      snapshot: null,
    },
    preserveDraft: true,
  };
}

function liveChat(sendTurnImpl?: () => Promise<unknown>) {
  return {
    sendTurn: vi.fn(
      sendTurnImpl ??
        (() =>
          Promise.resolve(ackOutcome()) as ReturnType<
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

function makeCtx(overrides: Record<string, unknown> = {}) {
  const ctx = {
    currentQuestion: QUESTION,
    sessionId: "00000000-0000-0000-0000-000000000001",
    chatBridge: { current: liveChat() },
    t: (key: string) => key,
    currentElapsedSeconds: () => 42,
    setTranscript: vi.fn(),
    setEndConfirming: vi.fn(),
    setEndConfirmPrompt: vi.fn(),
    beginClosing: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return ctx as unknown as InterviewActionsContext;
}

function calls(fn: unknown): unknown[][] {
  return (fn as { mock: { calls: unknown[][] } }).mock.calls;
}

function appendedTurns(ctx: InterviewActionsContext) {
  const setTranscript = ctx.setTranscript as unknown as {
    mock: { calls: [(prev: unknown[]) => unknown[]][] };
  };
  return setTranscript.mock.calls.flatMap((call) =>
    typeof call[0] === "function" ? call[0]([]) : [],
  );
}

describe("handleAssistance over lk.chat", () => {
  it("sends the turn_action the backend routes on", async () => {
    // The whole reason attributes exist: a hint request must reach the hint-ladder
    // tool, not be graded as an attempt at the answer.
    const chat = liveChat();
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleAssistance(ctx, "give me a hint", "hint", "Hint, please");

    expect(calls(chat.sendTurn)[0][0]).toMatchObject({
      text: "give me a hint",
      turnAction: "hint",
      turnKey: expect.any(String),
    });
  });

  it("never touches the REST respond mutation", async () => {
    // `ctx.respond` no longer exists; a reference to it would throw here.
    const ctx = makeCtx();
    await expect(
      handleAssistance(ctx, "what does this mean", "clarify", "Clarify"),
    ).resolves.toBeUndefined();
  });

  it("uses ONE key for the transcript entry and the wire idempotency key", async () => {
    // They used to be independent — a `${questionId}-${Date.now()}` transcript key
    // and a fresh newTurnKey() per attempt — so a resent assistance turn was a NEW
    // turn to the agent and could debit the hint ladder twice.
    const chat = liveChat();
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleAssistance(ctx, "give me a hint", "hint", "Hint, please");

    const { turnKey } = calls(chat.sendTurn)[0][0] as { turnKey: string };
    expect(appendedTurns(ctx)).toEqual([
      expect.objectContaining({ id: `a-${turnKey}`, role: "user", kind: "hint" }),
    ]);
  });

  it("tags a clarify turn as a clarification, not a hint", async () => {
    const ctx = makeCtx();

    await handleAssistance(ctx, "what is an index", "explain_term", "Explain");

    expect(appendedTurns(ctx)).toEqual([
      expect.objectContaining({ kind: "clarification" }),
    ]);
  });

  it("rolls the optimistic turn back when the agent refuses", async () => {
    // Optimistic-append is the assistance path's existing contract, so a refusal
    // has to remove the entry rather than leave a request the agent never took.
    const chat = liveChat(() => Promise.resolve(refusedOutcome()));
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleAssistance(ctx, "give me a hint", "hint", "Hint, please");

    const setTranscript = ctx.setTranscript as unknown as {
      mock: { calls: [(prev: { id: string }[]) => { id: string }[]][] };
    };
    expect(setTranscript.mock.calls).toHaveLength(2);
    const { turnKey } = calls(chat.sendTurn)[0][0] as { turnKey: string };
    const rollback = setTranscript.mock.calls[1][0];
    expect(rollback([{ id: `a-${turnKey}` }, { id: "keep-me" }])).toEqual([
      { id: "keep-me" },
    ]);
  });

  it("sends nothing when the room is not up", async () => {
    const ctx = makeCtx({ chatBridge: { current: null } });

    await handleAssistance(ctx, "give me a hint", "hint", "Hint, please");

    expect(ctx.setTranscript).not.toHaveBeenCalled();
  });

  it("sends nothing while a turn is already in flight", async () => {
    const chat = { ...liveChat(), pending: true };
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleAssistance(ctx, "give me a hint", "hint", "Hint, please");

    expect(chat.sendTurn).not.toHaveBeenCalled();
  });
});

describe("end-confirmation replies over lk.chat", () => {
  it("sends the canned confirm reply and closes the session", async () => {
    // The candidate pressed "End and submit", so the close is not conditional on
    // what the agent decides — the reply exists to keep its chat_ctx honest about
    // why the interview ended.
    const chat = liveChat();
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleEndConfirm(ctx);

    expect(calls(chat.sendTurn)[0][0]).toMatchObject({
      text: CONFIRM_END_REPLY,
      turnAction: "answer",
    });
    expect(ctx.setEndConfirming).toHaveBeenCalledWith(false);
    expect(ctx.beginClosing).toHaveBeenCalledWith("ended_early");
  });

  it("still closes when the confirm reply cannot be sent", async () => {
    const chat = liveChat(() => Promise.reject(new Error("room gone")));
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleEndConfirm(ctx);

    expect(ctx.beginClosing).toHaveBeenCalledWith("ended_early");
  });

  it("sends the canned cancel reply and returns to the question", async () => {
    const chat = liveChat();
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleEndCancel(ctx);

    expect(calls(chat.sendTurn)[0][0]).toMatchObject({
      text: CANCEL_END_REPLY,
      turnAction: "answer",
    });
    expect(ctx.setEndConfirming).toHaveBeenCalledWith(false);
    expect(ctx.setEndConfirmPrompt).toHaveBeenCalledWith("");
    expect(ctx.beginClosing).not.toHaveBeenCalled();
  });

  it("returns to the question even when the cancel reply fails", async () => {
    // Locally continuing is the safe default: the agent treats a non-confirm while
    // pending as a cancel, and never advanced or scored.
    const chat = liveChat(() => Promise.reject(new Error("room gone")));
    const ctx = makeCtx({ chatBridge: { current: chat } });

    await handleEndCancel(ctx);

    expect(ctx.setEndConfirming).toHaveBeenCalledWith(false);
    expect(ctx.setEndConfirmPrompt).toHaveBeenCalledWith("");
  });
});
