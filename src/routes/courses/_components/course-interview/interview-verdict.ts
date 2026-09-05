import type {
  InterviewSessionFinishResponse,
  InterviewSessionPublic,
} from "@/lib/api/types";

/**
 * Pure derivations for the async pass/fail verdict, extracted from
 * useInterviewServerSync so the four boolean chains that used to sit inline
 * (and pushed that hook to complexity 21) are named instead of nested.
 *
 * Every expression below is character-for-character the one it replaces.
 */

export interface FinishFlags {
  /** Session was abandoned — no evaluation will ever be produced. */
  evaluationUnavailable: boolean;
  /** The verdict frozen into the /finish response (null until the worker runs). */
  finishVerdict: boolean | null;
  /** No verdict is coming: the server says the grading budget is spent. */
  evaluationTerminallyFailed: boolean;
  /** Whether the gap-report query should run at all. */
  gapReportEnabled: boolean;
  /** Whether the verdict poll should run at all. */
  verdictPollEnabled: boolean;
}

/**
 * Is grading over for good? Reads the server-derived `evaluation_state`.
 *
 * `status: "failed"` on its own is NOT terminal and must never be treated as
 * such here. It means only that ARQ exhausted its retry budget for one job; the
 * backend recovery sweep re-drives exactly those rows, and the verdict often
 * lands a minute later. Freezing the screen on it was this module's bug: the
 * completion screen showed a permanent error, stopped polling, and the student
 * never saw the result that did arrive.
 *
 * Only `exhausted` is terminal — the server's own answer to "the recovery budget
 * is spent AND the last job has settled". `undefined` = a backend that predates
 * the field, where the old status-only reading is all there is.
 */
function isEvaluationTerminallyFailed(
  result: { status?: string; evaluation_state?: string } | null | undefined,
): boolean {
  if (!result) return false;
  if (result.evaluation_state !== undefined) {
    return result.evaluation_state === "exhausted";
  }
  return result.status === "failed";
}

/**
 * Don't keep polling for a gap report that will never be generated once
 * the evaluation has terminally failed (see evaluationFailed below) —
 * the 404-retry loop would otherwise burn its full 60 attempts (~3 min)
 * for nothing.
 *
 * The pass/fail verdict is produced by an async worker (~1-2 min) AFTER
 * /finish returns. At finish time pass_verdict is still null, so we must NOT
 * render it as a fail. Poll the session until the verdict resolves, then stop.
 *
 * The AI judge (LLM call) can fail outright (provider outage, malformed JSON
 * after retries, quota exhausted, ...). What makes that RECOVERABLE is the
 * backend's recovery sweep, so the stop condition is the server's
 * `evaluation_state`, never `status` — see isEvaluationTerminallyFailed.
 */
export function resolveFinishFlags(
  finishResult: InterviewSessionFinishResponse | null,
): FinishFlags {
  const evaluationUnavailable = finishResult?.status === "abandoned";
  const finishVerdict = finishResult?.pass_verdict ?? null;
  const evaluationTerminallyFailed =
    isEvaluationTerminallyFailed(finishResult);
  const gapReportEnabled = Boolean(
    finishResult && !evaluationTerminallyFailed && !evaluationUnavailable,
  );
  const verdictPollEnabled = Boolean(
    finishResult &&
      finishVerdict === null &&
      !evaluationTerminallyFailed &&
      !evaluationUnavailable,
  );
  return {
    evaluationUnavailable,
    finishVerdict,
    evaluationTerminallyFailed,
    gapReportEnabled,
    verdictPollEnabled,
  };
}

export interface VerdictState {
  /** Live verdict: prefer the polled value once it lands, else the finish value. */
  liveVerdict: boolean | null;
  evaluationFailed: boolean;
  verdictPending: boolean;
}

export function resolveVerdictState(args: {
  finishResult: InterviewSessionFinishResponse | null;
  verdictPoll: InterviewSessionPublic | undefined;
  flags: FinishFlags;
}): VerdictState {
  const { finishResult, verdictPoll, flags } = args;
  const { finishVerdict, evaluationTerminallyFailed, evaluationUnavailable } =
    flags;

  const liveVerdict: boolean | null =
    verdictPoll?.pass_verdict ?? finishVerdict;
  // Same rule for the polled row as for the finish response: `status: "failed"`
  // with a live recovery budget is still in flight. The poll is the fresher of
  // the two, so it can also CLEAR a stale terminal reading from /finish.
  const evaluationFailed = verdictPoll
    ? isEvaluationTerminallyFailed(verdictPoll)
    : evaluationTerminallyFailed;
  const verdictPending =
    !!finishResult &&
    liveVerdict === null &&
    !evaluationFailed &&
    !evaluationUnavailable;

  return { liveVerdict, evaluationFailed, verdictPending };
}
