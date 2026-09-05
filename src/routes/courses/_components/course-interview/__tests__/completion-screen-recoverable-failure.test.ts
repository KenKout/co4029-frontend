import { describe, expect, it } from "vitest";

import type {
  InterviewSessionFinishResponse,
  InterviewSessionPublic,
} from "@/lib/api/types";
import { resolveFinishFlags, resolveVerdictState } from "../interview-verdict";

/**
 * The interview completion screen must not freeze a RECOVERABLE grader failure.
 *
 * `status: "failed"` means one thing on the backend: ARQ exhausted its retry
 * budget for one evaluation job. The recovery sweep re-drives exactly those rows,
 * so the verdict frequently lands seconds to minutes later. Reading that status
 * as terminal made this screen show a permanent error, stop polling, and stop
 * fetching the gap report — the student never saw the result that did arrive.
 *
 * The server answers the real question in `evaluation_state`:
 *   pending    → a verdict is still coming (keep polling)
 *   exhausted  → the recovery budget is spent AND the last job settled (stop)
 *   succeeded / not_required → nothing to wait for
 *
 * These tests pin that the screen keys on `evaluation_state`, and that the
 * `status`-only reading survives only as a fallback for a backend that predates
 * the field.
 */

function finish(
  over: Partial<InterviewSessionFinishResponse> = {},
): InterviewSessionFinishResponse {
  return {
    session_id: "s-1",
    status: "completed",
    pass_verdict: null,
    evaluation_state: "pending",
    rubric_scores: [],
    can_retake: true,
    ...over,
  };
}

function polled(
  over: Partial<InterviewSessionPublic> = {},
): InterviewSessionPublic {
  return {
    session_id: "s-1",
    interview_config_id: "c-1",
    status: "completed",
    input_mode: "text",
    attempt_number: 1,
    started_at: "2026-09-05T00:00:00Z",
    onboarding_stage: "completed",
    interview_language: "en",
    pass_verdict: null,
    evaluation_state: "pending",
    can_retake: true,
    ...over,
  };
}

describe("a recoverable grader failure keeps the screen live", () => {
  it("keeps polling when /finish returns failed but recovery is pending", () => {
    const flags = resolveFinishFlags(
      finish({ status: "failed", evaluation_state: "pending" }),
    );

    expect(flags.evaluationTerminallyFailed).toBe(false);
    expect(flags.verdictPollEnabled).toBe(true);
  });

  it("keeps fetching the gap report for a pending recovery", () => {
    const flags = resolveFinishFlags(
      finish({ status: "failed", evaluation_state: "pending" }),
    );

    expect(flags.gapReportEnabled).toBe(true);
  });

  it("does not render a pending recovery as a failed evaluation", () => {
    const flags = resolveFinishFlags(
      finish({ status: "failed", evaluation_state: "pending" }),
    );
    const state = resolveVerdictState({
      finishResult: finish({ status: "failed", evaluation_state: "pending" }),
      verdictPoll: polled({ status: "failed", evaluation_state: "pending" }),
      flags,
    });

    expect(state.evaluationFailed).toBe(false);
    expect(state.verdictPending).toBe(true);
  });

  it("shows the verdict that lands after a failed status", () => {
    const finishResult = finish({ status: "failed", evaluation_state: "pending" });
    const state = resolveVerdictState({
      finishResult,
      verdictPoll: polled({
        status: "completed",
        pass_verdict: true,
        evaluation_state: "succeeded",
      }),
      flags: resolveFinishFlags(finishResult),
    });

    expect(state.liveVerdict).toBe(true);
    expect(state.evaluationFailed).toBe(false);
    expect(state.verdictPending).toBe(false);
  });

  it("lets a fresher poll clear a stale terminal reading from /finish", () => {
    // /finish was built before the recovery sweep re-drove the row.
    const finishResult = finish({
      status: "failed",
      evaluation_state: "exhausted",
    });
    const state = resolveVerdictState({
      finishResult,
      verdictPoll: polled({ status: "failed", evaluation_state: "pending" }),
      flags: resolveFinishFlags(finishResult),
    });

    expect(state.evaluationFailed).toBe(false);
    expect(state.verdictPending).toBe(true);
  });
});

describe("an exhausted budget still stops the screen", () => {
  it("treats exhausted as terminal and stops both queries", () => {
    const flags = resolveFinishFlags(
      finish({ status: "failed", evaluation_state: "exhausted" }),
    );

    expect(flags.evaluationTerminallyFailed).toBe(true);
    expect(flags.verdictPollEnabled).toBe(false);
    expect(flags.gapReportEnabled).toBe(false);
  });

  it("reports an exhausted poll as a failed evaluation", () => {
    const finishResult = finish();
    const state = resolveVerdictState({
      finishResult,
      verdictPoll: polled({ status: "failed", evaluation_state: "exhausted" }),
      flags: resolveFinishFlags(finishResult),
    });

    expect(state.evaluationFailed).toBe(true);
    expect(state.verdictPending).toBe(false);
  });

  it("still stops for an abandoned session", () => {
    const flags = resolveFinishFlags(
      finish({ status: "abandoned", evaluation_state: "not_required" }),
    );

    expect(flags.evaluationUnavailable).toBe(true);
    expect(flags.verdictPollEnabled).toBe(false);
    expect(flags.gapReportEnabled).toBe(false);
  });
});

describe("a backend that predates evaluation_state", () => {
  it("falls back to the old status-only reading", () => {
    const legacy = finish({ status: "failed" });
    delete (legacy as { evaluation_state?: unknown }).evaluation_state;

    const flags = resolveFinishFlags(legacy);

    expect(flags.evaluationTerminallyFailed).toBe(true);
    expect(flags.verdictPollEnabled).toBe(false);
  });

  it("still polls a legacy completed session with no verdict", () => {
    const legacy = finish({ status: "completed" });
    delete (legacy as { evaluation_state?: unknown }).evaluation_state;

    expect(resolveFinishFlags(legacy).verdictPollEnabled).toBe(true);
  });
});
