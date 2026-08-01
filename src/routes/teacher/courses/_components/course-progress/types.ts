import type { RosterProgressRead } from "@/lib/api/types";

/**
 * Shared types for the course Progress tab, extracted from the former 401-line
 * course-progress.tsx so the orchestrator and the presentational components
 * agree on one definition.
 */

/**
 * A cohort row joined with the roster's display name + email. The API sends
 * `completion_percent` as a string, and the page has always replaced it with the
 * `Number(...)`-coerced value — hence the `Omit`, which mirrors what the
 * spread-then-override object literal used to infer.
 */
export type ProgressRow = Omit<
  RosterProgressRead["students"][number],
  "completion_percent"
> & {
  completion_percent: number;
  display_name: string;
  email: string;
};

/** Roster lookup: student id → display name + email. */
export type StudentNameMap = Map<string, { name: string; email: string }>;

/** At-risk lookup: student id → first reason + days since engagement. */
export type AtRiskMap = Map<string, { reason: string; days: number | null }>;

export interface ProgressSummary {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  avgCompletion: number;
  totalHours: number;
}
