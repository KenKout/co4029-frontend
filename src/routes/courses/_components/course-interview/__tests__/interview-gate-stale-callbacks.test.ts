import { describe, expect, it, vi } from "vitest";

import {
  handleRespond,
} from "@/routes/courses/_components/course-interview/interview-answer-actions";
import {
  handleAssistance,
} from "@/routes/courses/_components/course-interview/interview-assistance-actions";
import type { InterviewActionsContext } from "@/routes/courses/_components/course-interview/types";

/**
 * Stale-callback protection: a click/callback still in flight when the
 * candidate escapes fullscreen must not send anything after the gate locks.
 * The guard reads the DOM (`isFullscreenNow`), not React state, because the
 * two can disagree for one render after `fullscreenchange`.
 */

const QUESTION = { id: "11111111-1111-1111-1111-111111111111" };

function liveChat() {
  return {
    sendTurn: vi.fn(() => Promise.resolve({ preserveDraft: false, event: {} })),
    pending: false,
    connected: true,
  };
}

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    currentQuestion: QUESTION,
    sessionId: "00000000-0000-0000-0000-000000000001",
    chatBridge: { current: liveChat() },
    answer: { state: { status: "idle" } },
    answerText: "an answer",
    // Gate LOCKED in the default: every test here asserts the block.
    fullscreenGate: { isFullscreenNow: () => false },
    t: (key: string) => key,
    currentElapsedSeconds: () => 42,
    beginSubmit: vi.fn(),
    submitFailed: vi.fn(),
    submitSucceeded: vi.fn(),
    markDraftSubmitted: vi.fn(),
    setRecentSubmission: vi.fn(),
    reopenForFollowUp: vi.fn(),
    setAnswerText: vi.fn(),
    setTranscript: vi.fn(),
    beginClosing: vi.fn().mockResolvedValue(undefined),
    setEndConfirming: vi.fn(),
    setEndConfirmPrompt: vi.fn(),
    ...overrides,
  } as unknown as InterviewActionsContext & Record<string, unknown>;
}

describe("stale callbacks are refused once the gate has locked", () => {
  it("handleRespond sends nothing", async () => {
    const ctx = makeCtx();
    const chat = (
      ctx.chatBridge as unknown as { current: { sendTurn: unknown } }
    ).current;

    await handleRespond(ctx);

    expect(chat.sendTurn).not.toHaveBeenCalled();
    expect(ctx.beginSubmit).not.toHaveBeenCalled();
    expect(ctx.setTranscript).not.toHaveBeenCalled();
  });

  it("handleAssistance sends nothing", async () => {
    const ctx = makeCtx();

    await handleAssistance(ctx, "give me a hint", "hint", "Hint, please");

    expect(ctx.setTranscript).not.toHaveBeenCalled();
  });

  it("a granted gate still allows the send (control)", async () => {
    const ctx = makeCtx({
      fullscreenGate: { isFullscreenNow: () => true },
    });
    const chat = (
      ctx.chatBridge as unknown as {
        current: { sendTurn: ReturnType<typeof vi.fn> };
      }
    ).current;

    await handleRespond(ctx);

    expect(chat.sendTurn).toHaveBeenCalledTimes(1);
  });
});
