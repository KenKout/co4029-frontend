import { describe, expect, it, vi } from "vitest";

import type { StateSnapshot } from "@/lib/interview/control-protocol";
import { applyStateSnapshot } from "@/routes/courses/_components/course-interview/interview-snapshot-actions";
import type { InterviewActionsContext } from "@/routes/courses/_components/course-interview/types";

/**
 * Applying a server snapshot from `abridge.interview.control`.
 *
 * The snapshot is the ONLY thing that tells the client the question changed, the
 * countdown moved or the interview ended — the agent streams, so none of it comes
 * back as a reply to a turn. It is absolute, never a delta, so this is a wholesale
 * replacement rather than a merge.
 */

const QUESTION_ONE = "11111111-1111-1111-1111-111111111111";
const QUESTION_TWO = "22222222-2222-2222-2222-222222222222";

function snapshot(over: Partial<StateSnapshot> = {}): StateSnapshot {
  return {
    currentQuestionId: QUESTION_TWO,
    currentQuestionText: "What does a covering index buy you?",
    questionNumber: 2,
    questionsRemaining: 2,
    questionsTotal: 3,
    outcomesCovered: 1,
    outcomesRequired: 3,
    isFinished: false,
    hasTimeLimit: true,
    timeRemainingSeconds: 300,
    ...over,
  };
}

function makeCtx(overrides: Record<string, unknown> = {}) {
  const ctx = {
    currentQuestion: {
      id: QUESTION_ONE,
      prompt_text: "Q1",
      question_type: null,
    },
    pendingNextQuestion: null,
    pendingFirstQuestion: null,
    t: (key: string) => key,
    currentElapsedSeconds: () => 42,
    reconcileDeadline: vi.fn(),
    setSessionProgress: vi.fn(),
    setPendingNextQuestion: vi.fn(),
    setPhase: vi.fn(),
    setTranscript: vi.fn(),
    setCurrentQuestion: vi.fn(),
    // Called when the server advances: that is the first evidence the answer to
    // the question being left was actually folded and stored, so the copy held
    // since the ack can finally go.
    clearDraftAutosave: vi.fn(),
    beginClosing: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return ctx as unknown as InterviewActionsContext;
}

/** The transcript the reducer passed to setTranscript would produce. */
function appendedTurns(ctx: InterviewActionsContext) {
  const setTranscript = ctx.setTranscript as unknown as {
    mock: { calls: [(prev: unknown[]) => unknown[]][] };
  };
  return setTranscript.mock.calls.flatMap((call) => call[0]([]));
}

describe("applyStateSnapshot — the question", () => {
  it("commits the new question as the card, with no invented transition line", () => {
    // Two rules at once. No localized `transitions.next_question` turn: the agent
    // speaks its own bridge ("Thanks, Duy. Now, imagine…") and that arrives as
    // transcription, so the canned line contradicted what was actually heard.
    // But the question itself MUST land in the transcript — the pinned card is the
    // last AI turn in it, so setting only `currentQuestion` advanced the "n of 3"
    // counter while the card kept showing question one.
    const ctx = makeCtx();

    applyStateSnapshot(ctx, snapshot());

    expect(ctx.setCurrentQuestion).toHaveBeenCalledWith({
      id: QUESTION_TWO,
      prompt_text: "What does a covering index buy you?",
      question_type: null,
    });
    expect(ctx.setPhase).toHaveBeenCalledWith("questioning");
    expect(ctx.setPendingNextQuestion).not.toHaveBeenCalled();

    const appended = appendedTurns(ctx);
    expect(appended).toHaveLength(1);
    expect(appended[0]).toMatchObject({
      role: "ai",
      kind: "question",
      isFollowUp: false,
      text: "What does a covering index buy you?",
    });
  });

  it("drops the parked answer copy once the server has moved on", () => {
    // The submit path PARKS the draft rather than deleting it: an `accepted` ack
    // means the agent has the text, not that the answer is stored, and a worker
    // that died mid-grading used to take the candidate's only copy with it.
    //
    // A server advance is the first proof the answer was folded — the server only
    // advances after grading the question it is leaving — so this is where the copy
    // is finally safe to drop.
    const ctx = makeCtx();

    applyStateSnapshot(ctx, snapshot());

    expect(ctx.clearDraftAutosave).toHaveBeenCalledTimes(1);
  });

  it("keeps the parked copy while the same question is still live", () => {
    // No advance, no proof of durability. A repeated snapshot for the question we
    // are already on must not discard the candidate's insurance copy.
    const ctx = makeCtx({
      currentQuestion: {
        id: QUESTION_TWO,
        prompt_text: "What does a covering index buy you?",
        question_type: null,
      },
    });

    applyStateSnapshot(ctx, snapshot());

    expect(ctx.clearDraftAutosave).not.toHaveBeenCalled();
  });

  it("does not commit the same question twice on a repeated snapshot", () => {
    const ctx = makeCtx();
    const setTranscript = ctx.setTranscript as unknown as {
      mock: { calls: [(prev: unknown[]) => unknown[]][] };
    };

    applyStateSnapshot(ctx, snapshot());
    const first = setTranscript.mock.calls[0][0]([]);

    expect(setTranscript.mock.calls[0][0](first)).toEqual(first);
  });

  it("takes the denominator from the server's pool, not index + remainder", () => {
    // Those two came from different server-side sources and drifted, walking the
    // header from "1 of 3" to "of 4" while the bank never changed.
    const ctx = makeCtx();

    applyStateSnapshot(ctx, {
      ...snapshot(),
      questionNumber: 2,
      questionsRemaining: 2,
    });

    expect(ctx.setSessionProgress).toHaveBeenCalledWith(
      expect.objectContaining({ questionsTotal: 3 }),
    );
  });

  it("is a no-op for the question already on screen", async () => {
    // Snapshots are published on join and on every state change, so the common
    // case is one that names the question the client is already showing.
    const ctx = makeCtx();

    applyStateSnapshot(ctx, snapshot({ currentQuestionId: QUESTION_ONE }));

    expect(ctx.setPendingNextQuestion).not.toHaveBeenCalled();
    expect(ctx.setPhase).not.toHaveBeenCalled();
    expect(ctx.setTranscript).not.toHaveBeenCalled();
  });

  it("is a no-op for a question already parked", async () => {
    // A repeated snapshot mid-transition must not append a second transition turn
    // or re-park the same card.
    const ctx = makeCtx({
      pendingNextQuestion: {
        id: QUESTION_TWO,
        prompt_text: "x",
        question_type: null,
      },
    });

    applyStateSnapshot(ctx, snapshot());

    expect(ctx.setPendingNextQuestion).not.toHaveBeenCalled();
    expect(ctx.setTranscript).not.toHaveBeenCalled();
  });

  it("leaves the onboarding handoff alone", async () => {
    // `pendingFirstQuestion` is the REST onboarding beat: the client is narrating a
    // transition line the agent never received. Racing it silences that line and
    // reveals question one twice.
    const ctx = makeCtx({
      pendingFirstQuestion: {
        id: QUESTION_TWO,
        prompt_text: "x",
        question_type: null,
      },
    });

    applyStateSnapshot(
      ctx,
      snapshot({ currentQuestionId: "33333333-3333-3333-3333-333333333333" }),
    );

    expect(ctx.setPendingNextQuestion).not.toHaveBeenCalled();
    expect(ctx.setPhase).not.toHaveBeenCalled();
  });

  it("does not invent a question before one has been presented", async () => {
    const ctx = makeCtx({ currentQuestion: null });

    applyStateSnapshot(ctx, snapshot());

    expect(ctx.setPendingNextQuestion).not.toHaveBeenCalled();
  });

  it("ignores a snapshot with no question text to render", async () => {
    const ctx = makeCtx();

    applyStateSnapshot(
      ctx,
      snapshot({ currentQuestionId: QUESTION_TWO, currentQuestionText: null }),
    );

    expect(ctx.setPendingNextQuestion).not.toHaveBeenCalled();
  });
});

describe("applyStateSnapshot — the deadline", () => {
  it("passes the countdown through with its has-time-limit flag", async () => {
    const ctx = makeCtx();

    applyStateSnapshot(ctx, snapshot({ timeRemainingSeconds: 480 }));

    expect(ctx.reconcileDeadline).toHaveBeenCalledWith({
      hasTimeLimit: true,
      timeRemainingSeconds: 480,
    });
  });

  it("reports an untimed session as untimed, not as a missing value", async () => {
    // The two look identical on the wire without the flag, and they demand
    // opposite actions: clear the deadline, or keep the last known one armed.
    const ctx = makeCtx();

    applyStateSnapshot(
      ctx,
      snapshot({ hasTimeLimit: false, timeRemainingSeconds: null }),
    );

    expect(ctx.reconcileDeadline).toHaveBeenCalledWith({
      hasTimeLimit: false,
      timeRemainingSeconds: null,
    });
  });
});

describe("applyStateSnapshot — progress and finishing", () => {
  it("replaces progress wholesale", async () => {
    const ctx = makeCtx();

    applyStateSnapshot(ctx, snapshot());

    expect(ctx.setSessionProgress).toHaveBeenCalledWith({
      questionNumber: 2,
      questionsRemaining: 2,
      questionsTotal: 3,
      outcomesCovered: 1,
      outcomesRequired: 3,
    });
  });

  it("closes the interview on is_finished, and stops there", async () => {
    // A finished session must not also present a question card on the way out.
    const ctx = makeCtx();

    applyStateSnapshot(ctx, snapshot({ isFinished: true }));

    expect(ctx.beginClosing).toHaveBeenCalledWith("natural");
    expect(ctx.setPendingNextQuestion).not.toHaveBeenCalled();
    // Progress and the deadline are still applied first, so the header does not
    // freeze on a stale count while the closing runs.
    expect(ctx.setSessionProgress).toHaveBeenCalledTimes(1);
    expect(ctx.reconcileDeadline).toHaveBeenCalledTimes(1);
  });
});
