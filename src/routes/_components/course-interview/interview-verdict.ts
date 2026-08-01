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
  /** The evaluation job exhausted its retries and stamped status = 'failed'. */
  evaluationTerminallyFailed: boolean;
  /** Whether the gap-report query should run at all. */
  gapReportEnabled: boolean;
  /** Whether the verdict poll should run at all. */
  verdictPollEnabled: boolean;
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
 * The AI judge (LLM call) can fail outright (provider outage, malformed
 * JSON after retries, quota exhausted, ...). The backend retries the job
 * up to 3 times (ARQ max_tries), then stamps InterviewSession.status =
 * 'failed' on the final attempt. Without checking for that terminal
 * status here, this poll would keep asking for a pass_verdict that will
 * never arrive and the student would wait forever.
 */
export function resolveFinishFlags(
  finishResult: InterviewSessionFinishResponse | null,
): FinishFlags {
  const evaluationUnavailable = finishResult?.status === "abandoned";
  const finishVerdict = finishResult?.pass_verdict ?? null;
  const evaluationTerminallyFailed = finishResult?.status === "failed" || false;
  const gapReportEnabled = Boolean(
    finishResult && finishResult.status !== "failed" && !evaluationUnavailable,
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
  const evaluationFailed =
    evaluationTerminallyFailed || verdictPoll?.status === "failed";
  const verdictPending =
    !!finishResult &&
    liveVerdict === null &&
    !evaluationFailed &&
    !evaluationUnavailable;

  return { liveVerdict, evaluationFailed, verdictPending };
}
