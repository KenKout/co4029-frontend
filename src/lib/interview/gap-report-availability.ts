/**
 * Why a gap report is missing, and whether waiting will ever help.
 *
 * The teacher page previously rendered `ApiError.message` directly, which is
 * `API ${status}: ${body}` — so a perfectly ordinary "not graded yet" 404 showed
 * the raw `{"detail":{"error":"not_found","resource":"gap_report","id":...}}`
 * payload, internal resource id and all.
 *
 * The important distinction is NOT the HTTP code, it is whether the report is
 * still coming. Grading runs asynchronously in an ARQ worker, so a `completed`
 * session legitimately 404s for a while and then starts working. But a session
 * the sweeper marked `abandoned` is never enqueued for evaluation at all — see
 * `services/lifecycle.py`, which only enqueues when the session produced at
 * least one student turn — so its report will never exist. Telling that teacher
 * to "check back shortly" sends them to wait for something that is not coming.
 *
 * Verified against production data for one such session: status `abandoned`,
 * `assessment_started_at` null, three transcript messages all from onboarding
 * (the single "user" message was the candidate typing their preferred name), no
 * gap_reports row, zero interview_outcome_evaluations.
 */

/** Session statuses that can still produce a gap report. */
const GRADEABLE_STATUSES = new Set(["completed", "timed_out"]);

/** Session statuses that will never produce one. */
const TERMINAL_UNGRADED_STATUSES = new Set(["abandoned", "failed"]);

export type GapReportUnavailableReason =
  /** Grading has not finished yet; the report should appear on its own. */
  | "pending_grading"
  /** The session ended without anything to grade. Waiting will not help. */
  | "never_graded"
  /** Interview is still running. */
  | "in_progress"
  /** Caller lacks permission. */
  | "forbidden"
  /** Anything genuinely unexpected (5xx, network, malformed response). */
  | "load_failed";

/**
 * Classify a missing gap report.
 *
 * @param httpStatus Status from `ApiError.status`, or undefined when the request
 *   did not fail (report simply absent from a successful response).
 * @param sessionStatus `InterviewSessionPublic.status`, when the session query
 *   has resolved. Undefined → fall back to HTTP-only reasoning.
 */
export function classifyMissingGapReport(
  httpStatus: number | undefined,
  sessionStatus: string | null | undefined,
): GapReportUnavailableReason {
  if (httpStatus === 403) return "forbidden";

  // Any non-404 failure is a real error; never explain it away as "pending".
  if (httpStatus !== undefined && httpStatus !== 404) return "load_failed";

  // 404 (or a merely-absent report): the session's own status decides whether
  // this is a waiting room or a dead end.
  if (sessionStatus === "in_progress") return "in_progress";
  if (sessionStatus && TERMINAL_UNGRADED_STATUSES.has(sessionStatus)) {
    return "never_graded";
  }
  if (sessionStatus && GRADEABLE_STATUSES.has(sessionStatus)) {
    return "pending_grading";
  }
  // Session status unknown (query still loading, or a status we don't model):
  // "pending" is the safer default — it does not tell the teacher to give up.
  return "pending_grading";
}

/** i18n key under `teacher_interview_gap_report.errors` for a reason. */
export function gapReportReasonI18nKey(
  reason: GapReportUnavailableReason,
): string {
  return `teacher_interview_gap_report.errors.${reason}`;
}
