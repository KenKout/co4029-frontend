import { describe, expect, it } from "vitest";

import {
  classifyMissingGapReport,
  gapReportEmptyStateI18nKey,
  gapReportReasonI18nKey,
  shouldRequestGapReport,
} from "@/lib/interview/gap-report-availability";

describe("classifyMissingGapReport", () => {
  it("treats an abandoned session as never gradeable, not pending", () => {
    // The bug this fixes: a session the sweeper abandoned is never enqueued for
    // evaluation, so "check back shortly" sends the teacher to wait forever.
    expect(classifyMissingGapReport(404, "abandoned")).toBe("never_graded");
  });

  it("classifies a legacy failed session (no evaluation_state) as never graded", () => {
    // Status-only shape: a backend predating the field. `failed` keeps the old
    // terminal reading — the same fallback the student verdict badge uses.
    expect(classifyMissingGapReport(404, "failed")).toBe("never_graded");
  });

  it("keeps a failed+pending session waiting, NOT never-graded", () => {
    // The server-derived state is authoritative: ARQ ran out of retries but
    // the recovery sweep re-drives exactly these rows, so the report may still
    // land. The old status-only reading told the teacher to give up.
    expect(
      classifyMissingGapReport(404, {
        status: "failed",
        evaluation_state: "pending",
      }),
    ).toBe("pending_grading");
  });

  it("maps failed+exhausted to its own dead-end reason", () => {
    const reason = classifyMissingGapReport(404, {
      status: "failed",
      evaluation_state: "exhausted",
    });
    expect(reason).toBe("evaluation_exhausted");
    expect(gapReportReasonI18nKey(reason)).toBe(
      "teacher_interview_gap_report.errors.evaluation_exhausted",
    );
    expect(gapReportEmptyStateI18nKey(reason)).toBe(
      "teacher_interview_gap_report.empty_states.evaluation_exhausted",
    );
  });

  it("maps abandoned+not_required to the not-graded empty state", () => {
    expect(
      classifyMissingGapReport(404, {
        status: "abandoned",
        evaluation_state: "not_required",
      }),
    ).toBe("never_graded");
    expect(gapReportEmptyStateI18nKey("never_graded")).toBe(
      "teacher_interview_gap_report.empty_states.not_graded",
    );
  });

  it("treats a succeeded session's missing report as still pending", () => {
    // succeeded = verdict published; the GAP row write races the session
    // update by seconds, so a 404 right after is genuinely "not yet".
    expect(
      classifyMissingGapReport(404, {
        status: "completed",
        evaluation_state: "succeeded",
      }),
    ).toBe("pending_grading");
  });

  it("treats a completed session's 404 as grading still in flight", () => {
    expect(classifyMissingGapReport(404, "completed")).toBe("pending_grading");
  });

  it("treats a timed_out session's 404 as grading still in flight", () => {
    // timed_out means the student DID answer (>=1 turn), so evaluation is
    // enqueued and the report really is coming.
    expect(classifyMissingGapReport(404, "timed_out")).toBe("pending_grading");
  });

  it("reports an in-progress interview as such", () => {
    expect(classifyMissingGapReport(404, "in_progress")).toBe("in_progress");
  });

  it("maps 403 to forbidden regardless of session status", () => {
    expect(classifyMissingGapReport(403, "completed")).toBe("forbidden");
    expect(classifyMissingGapReport(403, "abandoned")).toBe("forbidden");
    expect(classifyMissingGapReport(403, undefined)).toBe("forbidden");
  });

  it("never explains away a 5xx as pending grading", () => {
    expect(classifyMissingGapReport(500, "completed")).toBe("load_failed");
    expect(classifyMissingGapReport(502, "abandoned")).toBe("load_failed");
  });

  it("defaults to pending when the session status is not yet known", () => {
    // The session query resolves independently; until it does we must not tell
    // the teacher the report will never come.
    expect(classifyMissingGapReport(404, undefined)).toBe("pending_grading");
    expect(classifyMissingGapReport(404, null)).toBe("pending_grading");
    expect(classifyMissingGapReport(undefined, undefined)).toBe(
      "pending_grading",
    );
  });

  it("defaults to pending for an unmodelled session status", () => {
    expect(classifyMissingGapReport(404, "some_future_status")).toBe(
      "pending_grading",
    );
  });

  it("handles a successful response that simply carried no report", () => {
    expect(classifyMissingGapReport(undefined, "abandoned")).toBe(
      "never_graded",
    );
    expect(classifyMissingGapReport(undefined, "completed")).toBe(
      "pending_grading",
    );
  });
});

describe("shouldRequestGapReport", () => {
  it("blocks the request for an abandoned / not_required session", () => {
    expect(
      shouldRequestGapReport({
        status: "abandoned",
        evaluation_state: "not_required",
      }),
    ).toBe(false);
    expect(shouldRequestGapReport({ status: "abandoned" })).toBe(false);
  });

  it("blocks the request for an exhausted session", () => {
    expect(
      shouldRequestGapReport({
        status: "failed",
        evaluation_state: "exhausted",
      }),
    ).toBe(false);
  });

  it("allows pending and succeeded sessions (fetch now)", () => {
    expect(
      shouldRequestGapReport({
        status: "failed",
        evaluation_state: "pending",
      }),
    ).toBe(true);
    expect(
      shouldRequestGapReport({
        status: "completed",
        evaluation_state: "succeeded",
      }),
    ).toBe(true);
  });

  it("falls back to status-only for a legacy backend", () => {
    expect(shouldRequestGapReport({ status: "failed" })).toBe(false);
    expect(shouldRequestGapReport({ status: "completed" })).toBe(true);
    expect(shouldRequestGapReport({ status: "in_progress" })).toBe(true);
  });

  it("allows the request while the session is still unknown", () => {
    // The safer default: the session query may not have resolved yet.
    expect(shouldRequestGapReport(null)).toBe(true);
    expect(shouldRequestGapReport(undefined)).toBe(true);
  });
});

describe("gapReportReasonI18nKey", () => {
  it("namespaces every reason under the page's errors block", () => {
    expect(gapReportReasonI18nKey("never_graded")).toBe(
      "teacher_interview_gap_report.errors.never_graded",
    );
    expect(gapReportReasonI18nKey("load_failed")).toBe(
      "teacher_interview_gap_report.errors.load_failed",
    );
  });
});
