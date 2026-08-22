import type { GapReportRead } from "@/lib/api/types";

/**
 * Shared types for the read-only student view of a past interview result,
 * extracted from `me-interview-result.tsx` so the derivation helpers, the
 * verdict lookup tables and the presentational pieces agree on one shape.
 */

export type ResultPhase =
  | "pass"
  | "retry"
  | "evaluating"
  | "eval_failed"
  | "abandoned";

/** Everything derived from the session's timestamps, formatted for display. */
export interface SessionFacts {
  elapsedSeconds: number | null;
  resultDate: string | null;
  cooldownActive: boolean;
  cooldownLabel: string | null;
}

/** What the verdict hero renders: the phase, the facts and the session label. */
export interface VerdictHeroProps extends SessionFacts {
  phase: ResultPhase;
  title: string;
  attemptNumber: number;
}

export interface GapReportCardProps {
  gapReport: GapReportRead;
  phase: ResultPhase;
}

/** One remediation topic from the gap report's study plan. */
export type StudyPlanItem = NonNullable<GapReportRead["study_plan"]>[number];
