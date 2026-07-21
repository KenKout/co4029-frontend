import { describe, expect, it } from "vitest";

import {
  answerReducer,
  createInitialAnswerState,
  type AnswerState,
} from "../use-answer-state";

const draft = (overrides: Partial<AnswerState> = {}): AnswerState => ({
  ...createInitialAnswerState("q1"),
  ...overrides,
});

describe("answerReducer", () => {
  it("edits the draft while in draft state", () => {
    const next = answerReducer(draft(), { type: "editDraft", draft: "hi" });
    expect(next.draft).toBe("hi");
    expect(next.status).toBe("draft");
  });

  it("moves draft → submitting and records the submissionId", () => {
    const next = answerReducer(draft({ draft: "answer" }), {
      type: "submit",
      submissionId: "sub-1",
    });
    expect(next.status).toBe("submitting");
    expect(next.submissionId).toBe("sub-1");
    expect(next.draft).toBe("answer");
  });

  it("prevents a duplicate submission while one is in flight", () => {
    const submitting = draft({ status: "submitting", submissionId: "sub-1" });
    const next = answerReducer(submitting, {
      type: "submit",
      submissionId: "sub-2",
    });
    expect(next).toBe(submitting); // no-op, same reference
    expect(next.submissionId).toBe("sub-1");
  });

  it("ignores draft edits while submitting (can't race the request)", () => {
    const submitting = draft({ status: "submitting", draft: "locked" });
    const next = answerReducer(submitting, { type: "editDraft", draft: "x" });
    expect(next).toBe(submitting);
    expect(next.draft).toBe("locked");
  });

  it("clears the draft only on submitSuccess and stores submittedAnswer", () => {
    const submitting = draft({ status: "submitting", draft: "my answer" });
    const next = answerReducer(submitting, { type: "submitSuccess" });
    expect(next.status).toBe("submitted");
    expect(next.submittedAnswer).toBe("my answer");
    expect(next.draft).toBe("");
  });

  it("preserves the draft on submitFailure and exposes retry", () => {
    const submitting = draft({
      status: "submitting",
      draft: "preserved",
      submissionId: "sub-1",
    });
    const next = answerReducer(submitting, {
      type: "submitFailure",
      error: "network",
    });
    expect(next.status).toBe("failed");
    expect(next.draft).toBe("preserved");
    expect(next.error).toBe("network");
    // Same submissionId retained so a retry cannot create a duplicate.
    expect(next.submissionId).toBe("sub-1");
  });

  it("restoreDraft rolls a submitting turn back to draft with text preserved", () => {
    // Used when the backend reveals the 'answer' was a natural-language end
    // request → end-confirmation: it must NOT become a transcript entry, and
    // the candidate keeps their text if they choose to continue.
    const submitting = draft({
      status: "submitting",
      draft: "end the interview please",
      submissionId: "sub-1",
    });
    const next = answerReducer(submitting, { type: "restoreDraft" });
    expect(next.status).toBe("draft");
    expect(next.draft).toBe("end the interview please");
    expect(next.submissionId).toBeUndefined();
  });

  it("restoreDraft is a no-op when not submitting", () => {
    const ready = draft({ status: "draft", draft: "x" });
    expect(answerReducer(ready, { type: "restoreDraft" })).toBe(ready);
  });

  it("editing after a failure clears the error and returns to draft", () => {
    const failed = draft({ status: "failed", draft: "x", error: "network" });
    const next = answerReducer(failed, { type: "editDraft", draft: "xy" });
    expect(next.status).toBe("draft");
    expect(next.error).toBeNull();
    expect(next.draft).toBe("xy");
  });

  it("resets on a genuinely new questionId", () => {
    const submitted = draft({
      status: "submitted",
      submittedAnswer: "old",
      draft: "",
    });
    const next = answerReducer(submitted, { type: "reset", questionId: "q2" });
    expect(next.questionId).toBe("q2");
    expect(next.status).toBe("draft");
    expect(next.submittedAnswer).toBeNull();
  });

  it("does NOT reset when the questionId is unchanged (unrelated rerender)", () => {
    const inProgress = draft({ draft: "typing…" });
    const next = answerReducer(inProgress, { type: "reset", questionId: "q1" });
    expect(next).toBe(inProgress);
    expect(next.draft).toBe("typing…");
  });

  it("reopen returns a submitted answer to draft for a same-question follow-up", () => {
    const submitted = draft({
      status: "submitted",
      submittedAnswer: "prev",
      draft: "",
    });
    const next = answerReducer(submitted, { type: "reopen" });
    expect(next.status).toBe("draft");
    expect(next.draft).toBe("");
    // submittedAnswer kept so the confirmation can collapse to "previous".
    expect(next.submittedAnswer).toBe("prev");
  });

  it("submitSuccess is ignored unless a submission is in flight", () => {
    const idle = draft({ status: "draft" });
    expect(answerReducer(idle, { type: "submitSuccess" })).toBe(idle);
  });

  it("recording lifecycle round-trips through draft", () => {
    const rec = answerReducer(draft(), { type: "startRecording" });
    expect(rec.status).toBe("recording");
    const stopped = answerReducer(rec, {
      type: "stopRecording",
      draft: "spoken text",
    });
    expect(stopped.status).toBe("draft");
    expect(stopped.draft).toBe("spoken text");
  });
});
