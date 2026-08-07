import { describe, expect, it } from "vitest";

import { isComposerLocked } from "@/lib/interview/composer-lock";

/**
 * The answer surface must stay shut until the AI has actually replied.
 *
 * The handler already refused a duplicate submission (`resolveSubmitGate`), so
 * this is about the UI not lying: Send, the textarea and the mic were derived
 * from `respond.isPending` alone, which reopens the moment the turn is
 * *accepted* — before the AI has said anything. On the LiveKit transport that is
 * as soon as the control stream reports `completed`. The candidate got an
 * enabled Send that did nothing.
 *
 * `answer.state.status === "submitted"` closes the gap. The state machine leaves
 * `submitted` only via `resetForQuestion` (a new question arrived — driven by an
 * effect on `currentQuestion.id`) or `reopenForFollowUp` (the AI asked something
 * about this same answer), so the lock cannot get stuck on.
 */

const OPEN = {
  answerStatus: "draft",
  requestPending: false,
  agentStatus: "idle",
};

describe("isComposerLocked", () => {
  it("is open on a fresh draft with an idle interviewer", () => {
    expect(isComposerLocked(OPEN)).toBe(false);
  });

  it("locks while the request is in flight", () => {
    expect(isComposerLocked({ ...OPEN, requestPending: true })).toBe(true);
  });

  it("locks while the answer is submitting", () => {
    expect(isComposerLocked({ ...OPEN, answerStatus: "submitting" })).toBe(true);
  });

  it("STAYS locked after the turn is accepted but before the AI replies", () => {
    // THE gap. requestPending is already false and the next turn has not
    // mounted, so agentStatus is still "idle" — nothing else would hold the
    // composer shut here.
    expect(isComposerLocked({ ...OPEN, answerStatus: "submitted" })).toBe(true);
  });

  it("locks while the AI is thinking", () => {
    expect(isComposerLocked({ ...OPEN, agentStatus: "thinking" })).toBe(true);
  });

  it("locks while the AI is speaking", () => {
    // Also stops the candidate typing over the question being asked.
    expect(isComposerLocked({ ...OPEN, agentStatus: "speaking" })).toBe(true);
  });

  it("locks while disconnected", () => {
    expect(isComposerLocked({ ...OPEN, agentStatus: "disconnected" })).toBe(
      true,
    );
  });

  it("reopens once a new question resets the answer state", () => {
    // resetForQuestion runs from an effect on currentQuestion.id, so this is
    // the state the candidate lands in for question two.
    expect(
      isComposerLocked({
        answerStatus: "draft",
        requestPending: false,
        agentStatus: "idle",
      }),
    ).toBe(false);
  });

  it("reopens for a follow-up on the same answer", () => {
    // reopenForFollowUp moves the machine back to a draft state; the AI has
    // spoken by then, so the candidate must be able to answer.
    expect(
      isComposerLocked({
        answerStatus: "draft",
        requestPending: false,
        agentStatus: "listening",
      }),
    ).toBe(false);
  });

  it("stays open while the candidate is dictating", () => {
    // "listening" is the mic being live, not the AI holding the floor.
    expect(isComposerLocked({ ...OPEN, agentStatus: "listening" })).toBe(false);
  });

  it("does not lock on a failed submission — the draft must be retryable", () => {
    // submitFailure preserves the draft and exposes retry; locking here would
    // strand the candidate with an answer they cannot resend.
    expect(isComposerLocked({ ...OPEN, answerStatus: "failed" })).toBe(false);
  });
});
