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
 *
 * `evaluation_state` (server-derived) sharpens the status-only heuristic in
 * both directions the old code got wrong:
 *
 * - `status: "failed"` was treated as terminal ("never graded") although the
 *   recovery sweep re-drives exactly those rows. With the field present,
 *   `failed + pending` reads as `pending_grading` and only `exhausted` — the
 *   budget spent AND every phase record terminal — is a dead end.
 * - `abandoned` maps to `not_required` server-side; it stays `never_graded`.
 */

import type { InterviewEvaluationState } from "@/lib/api/types/interview-evaluation";

/** Session statuses that can still produce a gap report. */
const GRADEABLE_STATUSES = new Set(["completed", "timed_out"]);

/** Session statuses that will never produce one. */
const TERMINAL_UNGRADED_STATUSES = new Set(["abandoned", "failed"]);

export type GapReportUnavailableReason =
  /** Grading has not finished yet; the report should appear on its own. */
  | "pending_grading"
  /** The session ended without anything to grade. Waiting will not help. */
  | "never_graded"
  /** Evaluation ran out of retries AND recovery budget: no report will come. */
  | "evaluation_exhausted"
  /** Interview is still running. */
  | "in_progress"
  /** Caller lacks permission. */
  | "forbidden"
  /** Anything genuinely unexpected (5xx, network, malformed response). */
  | "load_failed";

export interface GapReportSessionInput {
  status?: string | null;
  evaluation_state?: InterviewEvaluationState;
}

/**
 * Whether fetching/polling the GAP report can possibly succeed now or later.
 *
 * Shared by the hook (`enabled` flag) and the route so NEITHER fires the
 * request for a session that can never have a report — the abandoned attempt
 * used to burn 60 retries × 3s behind a full-screen spinner for nothing.
 *
 * Legacy fallback (field absent — old backend): mirror the student verdict
 * fallback, where only `failed` is (wrongly) treated as terminal, so we do
 * stop instead of polling forever on the one status we cannot vouch for.
 */
export function shouldRequestGapReport(
  session: GapReportSessionInput | null | undefined,
): boolean {
  if (!session) return true; // unknown yet — the safer default is to try
  const state = session.evaluation_state;
  if (state !== undefined) {
    // `pending` may still produce a report (fetch now, poll while pending);
    // `succeeded` means a report exists. Only the dead ends are excluded.
    return state !== "not_required" && state !== "exhausted";
  }
  if (session.status === "abandoned") return false;
  if (session.status === "failed") return false; // legacy terminal reading
  return true;
}

/**
 * Classify a missing gap report.
 *
 * @param httpStatus Status from `ApiError.status`, or undefined when the request
 *   did not fail (report simply absent from a successful response).
 * @param session The session query result, when it has resolved. Undefined →
 *   fall back to HTTP-only reasoning. A bare string is also accepted for the
 *   status-only legacy shape.
 */
export function classifyMissingGapReport(
  httpStatus: number | undefined,
  session:
    | GapReportSessionInput
    | string
    | null
    | undefined,
): GapReportUnavailableReason {
  if (httpStatus === 403) return "forbidden";

  // Any non-404 failure is a real error; never explain it away as "pending".
  if (httpStatus !== undefined && httpStatus !== 404) return "load_failed";

  const sessionStatus =
    typeof session === "string" ? session : session?.status;
  const evaluationState =
    typeof session === "string" ? undefined : session?.evaluation_state;

  // The server-derived state is authoritative when present.
  if (evaluationState !== undefined) {
    if (evaluationState === "exhausted") return "evaluation_exhausted";
    if (evaluationState === "not_required") {
      return "never_graded";
    }
    if (evaluationState === "succeeded" || evaluationState === "pending") {
      return "pending_grading";
    }
  }

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

/** i18n key under `teacher_interview_gap_report.empty_states` for a reason. */
export function gapReportEmptyStateI18nKey(
  reason: GapReportUnavailableReason,
): string | null {
  if (reason === "never_graded") {
    return "teacher_interview_gap_report.empty_states.not_graded";
  }
  if (reason === "evaluation_exhausted") {
    return "teacher_interview_gap_report.empty_states.evaluation_exhausted";
  }
  return null;
}
