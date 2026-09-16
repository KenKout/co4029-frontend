/**
 * Shared verdict-state derivation for interview session rows.
 *
 * Moved here from `routes/me/_components/interview-result/verdict-state.ts`
 * so the TEACHER surfaces (attempts list, assessments tables, filter helpers)
 * render the SAME badge a student sees for the same row. Three teacher copies
 * of this logic used to trust `status === "failed"` as terminal — the exact
 * misreading the server-derived `evaluation_state` exists to prevent — so a
 * recoverable grader failure froze as "Evaluation failed" while the recovery
 * sweep was about to re-drive the row.
 *
 * The parameter is a minimal structural type: every session-shaped DTO
 * (`InterviewSessionPublic`, `InterviewSessionSummary`,
 * `InterviewSessionTeacherRead`) satisfies it, and a response from a backend
 * predating `evaluation_state` still type-checks (the field is optional).
 */

import type { InterviewEvaluationState } from "@/lib/api/types/interview-evaluation";

export type VerdictState =
  | "passed"
  | "not_passed"
  | "evaluating"
  | "in_progress"
  | "evaluation_failed"
  | "not_graded";

export interface VerdictStateInput {
  status: string;
  pass_verdict?: boolean | null;
  evaluation_state?: InterviewEvaluationState;
}

/**
 * The badge shown for one attempt — shared by student history and teacher
 * lists so a row and its detail view can never disagree.
 *
 * `status: "failed"` is deliberately NOT trusted on its own: it means only
 * that ARQ exhausted its retry budget, and the recovery sweep re-drives
 * exactly those rows. `evaluation_state` is the server's answer to "is a
 * verdict still coming?", so `pending` keeps the row in "evaluating" and only
 * `exhausted` earns the error badge.
 */
export function verdictState(s: VerdictStateInput): VerdictState {
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
