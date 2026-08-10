/**
 * The hint ladder's depth, mirrored from the backend.
 *
 * Server-side source of truth is `MAX_CANNOT_ANSWER_HINTS` in
 * `backend/abridgeai/features/interviews/orchestrator/decision.py`. The learner
 * client has no snapshot field carrying it, so it is duplicated here rather than
 * inferred — and the two must be changed together.
 *
 * Scoped PER QUESTION: the server resets `hint_level` when the interview
 * advances, so a candidate gets this many hints on every question, not this many
 * for the whole session.
 */
export const MAX_HINTS_PER_QUESTION = 3;

/** Whether another hint may be requested on the current question. */
export function hintsRemaining(hintsUsed: number): number {
  return Math.max(0, MAX_HINTS_PER_QUESTION - hintsUsed);
}

/** True once the candidate has spent every rung on the current question. */
export function hintLadderExhausted(hintsUsed: number): boolean {
  return hintsRemaining(hintsUsed) === 0;
}
