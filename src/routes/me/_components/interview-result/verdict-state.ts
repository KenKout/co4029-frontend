import type { InterviewSessionPublic } from "@/lib/api/types";

export type VerdictState =
  | "passed"
  | "not_passed"
  | "evaluating"
  | "in_progress"
  | "evaluation_failed"
  | "not_graded";

/**
 * The badge shown for one attempt in the student's interview history.
 *
 * Thesis §4.3: students see the binary verdict ONLY. A session whose async
 * evaluation hasn't landed yet must read as "evaluating", never as a fail.
 *
 * `status: "failed"` is deliberately NOT trusted on its own: it means only that
 * ARQ exhausted its retry budget, and the recovery sweep re-drives exactly those
 * rows. `evaluation_state` is the server's answer to "is a verdict still
 * coming?", so `pending` keeps the row in "evaluating" and only `exhausted`
 * earns the error badge. Shared with the result page so a row and its detail
 * view can never disagree.
 */
export function verdictState(s: InterviewSessionPublic): VerdictState {
  if (s.status === "in_progress") return "in_progress";
  if (s.pass_verdict === true) return "passed";
  if (s.pass_verdict === false) return "not_passed";
  if (s.status === "abandoned") return "not_graded";
  if (s.evaluation_state === "exhausted") return "evaluation_failed";
  if (s.evaluation_state === undefined && s.status === "failed") {
    // Backend predates the field — fall back to the old status-only reading.
    return "evaluation_failed";
  }
  return "evaluating";
}
