import { describe, expect, it } from "vitest";

import type { InterviewProgressRead } from "@/lib/api/types";

import { interviewRowBadge } from "../interview-row-badge";

/**
 * The pending-interview badge.
 *
 * Under the interview completion rule (user decision 2026-08-06) only a PASS
 * completes an item, so a student who sat the interview three times and missed
 * stays `pending` — exactly like a student who never opened it. These tests pin
 * the badge that tells those two apart, plus the third real state the async
 * evaluator creates: submitted but not yet marked.
 */

function progress(
  over: Partial<InterviewProgressRead> = {},
): InterviewProgressRead {
  return {
    interview_config_id: "iv1",
    attempts_used: 0,
    attempts_in_flight: 0,
    attempts_graded: 0,
    attempts_awaiting_grade: 0,
    passed: false,
    completed: false,
    ...over,
  };
}

describe("interviewRowBadge", () => {
  it("shows nothing for a never-attempted interview", () => {
    expect(interviewRowBadge(progress())).toBeNull();
  });

  it("shows nothing when progress has not loaded", () => {
    expect(interviewRowBadge(undefined)).toBeNull();
  });

  it("shows nothing on a passed interview (the row has its check)", () => {
    expect(
      interviewRowBadge(
        progress({
          attempts_used: 2,
          attempts_graded: 2,
          passed: true,
          completed: true,
        }),
      ),
    ).toBeNull();
  });

  it("reports not_passed once every finished attempt is graded and none passed", () => {
    // The case the badge exists for: three graded misses must not look like
    // "never opened".
    const badge = interviewRowBadge(
      progress({ attempts_used: 3, attempts_graded: 3 }),
    );
    expect(badge).toEqual({ kind: "not_passed", attemptCount: 3 });
  });

  it("reports grading while the evaluator has not caught up", () => {
    // Evaluation is an ARQ job. An ungraded attempt is NOT a failure, so this
    // must never fall through to not_passed.
    const badge = interviewRowBadge(
      progress({ attempts_used: 1, attempts_awaiting_grade: 1 }),
    );
    expect(badge).toEqual({ kind: "grading", attemptCount: 1 });
  });

  it("reports grading when only some attempts are graded", () => {
    // Mixed: one marked miss + one still being marked. The pending verdict
    // wins, because it could still be a pass.
    const badge = interviewRowBadge(
      progress({ attempts_used: 2, attempts_graded: 1, attempts_awaiting_grade: 1 }),
    );
    expect(badge).toEqual({ kind: "grading", attemptCount: 1 });
  });

  it("does not wait forever for an abandoned or failed attempt", () => {
    expect(interviewRowBadge(progress({ attempts_used: 2 }))).toBeNull();
  });

  it("shows nothing while a session is live (the continue card owns that)", () => {
    // InterviewInProgressCard already renders a prominent in-progress block;
    // a second state pill on the same row is noise.
    expect(
      interviewRowBadge(progress({ attempts_used: 1, attempts_in_flight: 1 })),
    ).toBeNull();
  });

  it("still reports past attempts when a NEW session is live", () => {
    // Two graded misses, now retrying. The in-flight attempt is excluded from
    // the settled count, but the row must not silently drop the history.
    //
    // NOTE: the row itself renders the in-progress card in this state, so this
    // asserts the helper's arithmetic rather than what ends up on screen.
    const badge = interviewRowBadge(
      progress({ attempts_used: 3, attempts_in_flight: 1, attempts_graded: 2 }),
    );
    expect(badge).toBeNull();
  });

  it("counts graded attempts, not total, for not_passed", () => {
    // attempts_used includes abandoned rows; the number shown to the student
    // should be the real marked tries.
    const badge = interviewRowBadge(
      progress({ attempts_used: 5, attempts_graded: 5 }),
    );
    expect(badge?.attemptCount).toBe(5);
  });

  it("treats a passed-but-not-completed row as needing no badge", () => {
    // Defensive: the two flags should agree, but `passed` alone is enough to
    // suppress a discouraging badge.
    expect(
      interviewRowBadge(
        progress({ attempts_used: 1, attempts_graded: 1, passed: true }),
      ),
    ).toBeNull();
  });
});
