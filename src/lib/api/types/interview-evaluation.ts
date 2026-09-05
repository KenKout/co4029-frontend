/**
 * Interview evaluation-state contract (server-derived).
 *
 * Split out of `types.ts` because that file is already over the 800-line
 * eslint cap; the same precedent as the other `types/` submodules.
 */

/**
 * Whether an interview session's async evaluation is still expected to produce
 * a verdict. Derived by the backend — the frontend must NOT re-derive it from
 * `status` + `pass_verdict`, because `status: "failed"` is not terminal while
 * the recovery sweep can still re-drive the session.
 *
 *  - `pending`      — keep polling: a job is running or recovery can retry.
 *  - `succeeded`    — a verdict is published (`pass_verdict` false counts).
 *  - `exhausted`    — recovery budget spent; no verdict will ever arrive.
 *  - `not_required` — nothing to wait for (live, abandoned, never assessed).
 */
export type InterviewEvaluationState =
  | "not_required"
  | "pending"
  | "succeeded"
  | "exhausted";
