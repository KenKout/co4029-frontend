/**
 * Shared types for the per-student course detail page, extracted from the
 * former 659-line course-student-detail.tsx so the orchestrator and the
 * presentational components agree on one definition. No behavioural surface of
 * its own.
 */

/** Risk badge metadata as `RISK_META` stores it. */
export interface RiskMeta {
  label: string;
  badge: string;
  bar: string;
}

/** Enrollment badge metadata as `ENROLL_META` stores it. */
export interface EnrollMeta {
  label: string;
  badge: string;
}
