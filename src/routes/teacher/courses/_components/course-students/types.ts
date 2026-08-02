/**
 * Shared types for the course Students (roster) page, extracted from the
 * former 658-line course-students.tsx so the orchestrator, the controller hook
 * and the presentational components agree on one definition. No behavioural
 * surface of its own.
 */

export type StatusFilter =
  | "all"
  | "active"
  | "completed"
  | "dropped"
  | "at_risk";

/** One row of the Cohort Overview risk breakdown. */
export interface RiskBreakdownEntry {
  level: "high" | "medium" | "low" | "none";
  meta: { label: string; badge: string; dot: string };
  count: number;
  pct: number;
}
