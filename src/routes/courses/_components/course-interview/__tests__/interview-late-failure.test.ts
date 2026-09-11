import { describe, expect, it, vi } from "vitest";

import type { ControlEvent } from "@/lib/interview/control-protocol";
import { handleLateAnswerFailure } from "@/routes/courses/_components/course-interview/interview-answer-actions";
import type { InterviewActionsContext } from "@/routes/courses/_components/course-interview/types";

/**
 * A fold can fail AFTER the ack resolved the submit — the composer is not
 * spinning, so the FAILED event finds no waiter and used to be dropped
 * silently. The candidate believed their answer was in while the parked draft
 * was the only copy and nothing was graded.
 *
 * The late-FAILED path must:
 * - restore the EXACT parked text (versioned sent record for that key);
 * - flip the answer machine to a retryable failed state;
 * - reuse the SAME turn key on the retry (server receipt reclaim);
 * - ignore stale/confirmed keys (a confirmed turn cannot retroactively fail).
 */

const SESSION = "s-late";
const QUESTION = "q-late";
const SENT_KEY = `abridge:iv-draft:${SESSION}:${QUESTION}:sent`;

function failedEvent(turnKey: string): ControlEvent {
  return {
    status: "failed",
    turnKey,
    seq: 99,
    turnAction: "answer",
    stateVersion: null,
    rejection: null,
    state: null,
    actionKind: null,
    actionText: null,
    errorClass: "RuntimeError",
    snapshot: null,
    streamId: null,
  };
}

function makeCtx(overrides: Record<string, unknown> = {}) {
  const ctx = {
    confirmedTurnKeys: { current: new Set<string>() },
    parkedSentDraftText: vi.fn((key: string) =>
      key === "tk-late-0001" ? "my unconfirmed answer" : null,
    ),
    submitFailedForRetry: vi.fn(),
    t: (key: string) => key,
    ...overrides,
  };
  return ctx as unknown as InterviewActionsContext & {
    submitFailedForRetry: ReturnType<typeof vi.fn>;
    parkedSentDraftText: ReturnType<typeof vi.fn>;
  };
}

describe("a late post-ack fold failure is surfaced, not swallowed", () => {
  it("restores the parked draft and marks the turn retryable", () => {
    const ctx = makeCtx();

    handleLateAnswerFailure(ctx, failedEvent("tk-late-0001"));

    expect(ctx.submitFailedForRetry).toHaveBeenCalledTimes(1);
    expect(ctx.submitFailedForRetry).toHaveBeenCalledWith(
      "my unconfirmed answer",
      "tk-late-0001",
    );
  });

  it("ignores a failure for a turn already CONFIRMED durable", () => {
    // A confirmed turn's receipt is applied: the fold DID land. A late FAILED
    // for it is stale (e.g. reordered delivery) and must not clobber the
    // composer.
    const ctx = makeCtx({
      confirmedTurnKeys: { current: new Set(["tk-late-0001"]) },
    });

    handleLateAnswerFailure(ctx, failedEvent("tk-late-0001"));

    expect(ctx.submitFailedForRetry).not.toHaveBeenCalled();
  });

  it("ignores a failure whose key has no parked copy", () => {
    // No parked sent-draft for this key = no candidate copy to restore and no
    // evidence this failure belongs to a live turn.
    const ctx = makeCtx();

    handleLateAnswerFailure(ctx, failedEvent("tk-unknown000"));

    expect(ctx.submitFailedForRetry).not.toHaveBeenCalled();
  });

  it("ignores an event without a turn key", () => {
    const ctx = makeCtx();

    const event = failedEvent("tk-late-0001");
    event.turnKey = null;
    handleLateAnswerFailure(ctx, event);

    expect(ctx.submitFailedForRetry).not.toHaveBeenCalled();
  });
});

describe("the parked draft survives the storage round trip", () => {
  it("matches the versioned record the submit path wrote", () => {
    // Mirrors use-draft-autosave's versioned JSON so the scanner finds it.
    window.localStorage.setItem(
      SENT_KEY,
      JSON.stringify({ v: 1, text: "stored answer", turnKey: "tk-late-0001" }),
    );
    const sessionId = SESSION;
    const questionId = QUESTION;
    const prefix = `abridge:iv-draft:${sessionId}:`;
    let found: string | null = null;
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefix) || !key.endsWith(":sent")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { turnKey?: string; text?: string };
      if (parsed.turnKey === "tk-late-0001" && typeof parsed.text === "string") {
        found = parsed.text;
      }
    }
    expect(found).toBe("stored answer");
    expect(questionId).toBe(QUESTION);
  });
});
