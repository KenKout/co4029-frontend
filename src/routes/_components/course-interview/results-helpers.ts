import type { ResultPhase } from "./constants";

/**
 * Pure derivations for the results screen, extracted unchanged from the results
 * branch of course-interview.tsx.
 */

export function resolveResultPhase(args: {
  evaluationFailed: boolean;
  evaluationUnavailable: boolean;
  verdictPending: boolean;
  liveVerdict: boolean | null;
}): ResultPhase {
  const {
    evaluationFailed,
    evaluationUnavailable,
    verdictPending,
    liveVerdict,
  } = args;
  return evaluationFailed
    ? "eval_failed"
    : evaluationUnavailable
      ? "abandoned"
      : verdictPending
        ? "evaluating"
        : liveVerdict
          ? "pass"
          : "retry";
}

export interface ResultFacts {
  elapsedResultSeconds: number | null;
  resultDate: string | null;
  resultAttemptNumber: number | null;
  remainingAttempts: number | null;
  cooldownActive: boolean;
  outOfAttempts: boolean;
  canRetry: boolean;
  cooldownLabel: string | null;
}

/**
 * Retake context (#7) — the caller prefers the freshest source (the verdict
 * poll survives reload) then the finish response.
 */
interface RetakeSource {
  remaining_attempts?: number | null;
  retake_available_at?: string | null;
}

export function resolveResultFacts(args: {
  endedAt: string | null | undefined;
  assessmentStartedAtMs: number | null;
  retakeSource: RetakeSource;
  polledAttemptNumber: number | null | undefined;
  fallbackAttemptNumber: number | null | undefined;
  resultLocale: string;
  resultPhase: ResultPhase;
}): ResultFacts {
  const {
    endedAt,
    assessmentStartedAtMs,
    retakeSource,
    polledAttemptNumber,
    fallbackAttemptNumber,
    resultLocale,
    resultPhase,
  } = args;

  // Session facts: elapsed (ended_at − assessment start), attempt #, date.
  const finishedAtMs = endedAt ? new Date(endedAt).getTime() : null;
  const elapsedResultSeconds =
    finishedAtMs !== null && assessmentStartedAtMs !== null
      ? Math.max(0, Math.floor((finishedAtMs - assessmentStartedAtMs) / 1000))
      : null;
  const resultDate = endedAt
    ? new Date(endedAt).toLocaleDateString(resultLocale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const remainingAttempts = retakeSource.remaining_attempts ?? null;
  const retakeAvailableAt = retakeSource.retake_available_at ?? null;
  const cooldownActive =
    retakeAvailableAt !== null &&
    new Date(retakeAvailableAt).getTime() > Date.now();
  const outOfAttempts = remainingAttempts !== null && remainingAttempts <= 0;
  const canRetry = resultPhase === "retry" && !cooldownActive && !outOfAttempts;
  const cooldownLabel = retakeAvailableAt
    ? new Date(retakeAvailableAt).toLocaleString(resultLocale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // attempt_number lives on the session projection (verdictPoll), not the
  // finish response; fall back to the resumable/last known attempt.
  const resultAttemptNumber =
    polledAttemptNumber ?? fallbackAttemptNumber ?? null;

  return {
    elapsedResultSeconds,
    resultDate,
    resultAttemptNumber,
    remainingAttempts,
    cooldownActive,
    outOfAttempts,
    canRetry,
    cooldownLabel,
  };
}
