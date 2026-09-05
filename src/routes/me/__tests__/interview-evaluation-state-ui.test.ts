import { describe, expect, it } from "vitest";

import type { InterviewSessionPublic } from "@/lib/api/types";
import { phaseFor } from "@/routes/me/_components/interview-result/helpers";
import { verdictState } from "@/routes/me/_components/interview-result/verdict-state";

/**
 * A grader failure that recovery can still re-drive must not read as a dead end.
 *
 * `status: "failed"` means one thing: ARQ ran out of retries. The recovery sweep
 * picks exactly those rows up, so showing a red "evaluation failed" badge (and,
 * on the result page, hiding the pending gap-report card) told the student the
 * interview was broken while it was in fact still being graded.
 *
 * `evaluation_state` distinguishes the two cases the old `status`-only logic
 * conflated: `pending` (still coming) vs `exhausted` (genuinely never coming).
 */
function session(
  overrides: Partial<InterviewSessionPublic>,
): InterviewSessionPublic {
  return {
    session_id: "00000000-0000-0000-0000-0000000000a1",
    interview_config_id: "00000000-0000-0000-0000-0000000000b1",
    status: "completed",
    input_mode: "hybrid",
    attempt_number: 1,
    started_at: "2026-09-05T00:00:00Z",
    onboarding_stage: "completed",
    interview_language: "en",
    pass_verdict: null,
    evaluation_state: "pending",
    ...overrides,
  } as InterviewSessionPublic;
}

describe("history badge", () => {
  it("shows a recoverable grader failure as still evaluating", () => {
    expect(
      verdictState(session({ status: "failed", evaluation_state: "pending" })),
    ).toBe("evaluating");
  });

  it("shows an exhausted recovery budget as an evaluation failure", () => {
    expect(
      verdictState(session({ status: "failed", evaluation_state: "exhausted" })),
    ).toBe("evaluation_failed");
  });

  it("shows a recovered session by its verdict, not its old status", () => {
    expect(
      verdictState(
        session({
          status: "failed",
          pass_verdict: true,
          evaluation_state: "succeeded",
        }),
      ),
    ).toBe("passed");
  });

  it("still reports published verdicts and live/abandoned sessions", () => {
    expect(
      verdictState(session({ pass_verdict: true, evaluation_state: "succeeded" })),
    ).toBe("passed");
    expect(
      verdictState(session({ pass_verdict: false, evaluation_state: "succeeded" })),
    ).toBe("not_passed");
    expect(
      verdictState(
        session({ status: "in_progress", evaluation_state: "not_required" }),
      ),
    ).toBe("in_progress");
    expect(
      verdictState(
        session({ status: "abandoned", evaluation_state: "not_required" }),
      ),
    ).toBe("not_graded");
  });

  it("falls back to the status when the backend omits evaluation_state", () => {
    const legacy = session({ status: "failed" });
    delete (legacy as { evaluation_state?: unknown }).evaluation_state;
    expect(verdictState(legacy)).toBe("evaluation_failed");
  });
});

describe("result page phase", () => {
  it("keeps a recoverable grader failure in the evaluating phase", () => {
    expect(
      phaseFor(session({ status: "failed", evaluation_state: "pending" })),
    ).toBe("evaluating");
  });

  it("reports an exhausted budget as a terminal evaluation failure", () => {
    expect(
      phaseFor(session({ status: "failed", evaluation_state: "exhausted" })),
    ).toBe("eval_failed");
  });

  it("reports a recovered session by its verdict", () => {
    expect(
      phaseFor(
        session({
          status: "failed",
          pass_verdict: false,
          evaluation_state: "succeeded",
        }),
      ),
    ).toBe("retry");
  });

  it("leaves the other phases unchanged", () => {
    expect(
      phaseFor(session({ pass_verdict: true, evaluation_state: "succeeded" })),
    ).toBe("pass");
    expect(
      phaseFor(session({ status: "abandoned", evaluation_state: "not_required" })),
    ).toBe("abandoned");
    expect(
      phaseFor(
        session({ status: "in_progress", evaluation_state: "not_required" }),
      ),
    ).toBe("evaluating");
  });
});
