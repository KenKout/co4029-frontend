import { describe, expect, it } from "vitest";

import {
  classifyMissingGapReport,
  gapReportReasonI18nKey,
} from "@/lib/interview/gap-report-availability";

describe("classifyMissingGapReport", () => {
  it("treats an abandoned session as never gradeable, not pending", () => {
    // The bug this fixes: a session the sweeper abandoned is never enqueued for
    // evaluation, so "check back shortly" sends the teacher to wait forever.
    expect(classifyMissingGapReport(404, "abandoned")).toBe("never_graded");
  });

  it("treats a failed session as never gradeable", () => {
    expect(classifyMissingGapReport(404, "failed")).toBe("never_graded");
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
