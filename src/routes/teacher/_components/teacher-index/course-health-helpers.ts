import type { CourseHealthRow } from "@/lib/api/hooks/teacher-courses";

/**
 * Below this many graded student-quiz pairs a pass rate is noise.
 *
 * FR-054: a percentage without a usable denominator invites a decision the
 * data cannot support — "33% pass rate" off three attempts reads as a
 * failing course when it is one student having a bad afternoon.
 */
export const MIN_PASS_SAMPLE = 5;

/** Whether the pass rate has enough behind it to show as a percentage. */
export function hasUsablePassRate(row: CourseHealthRow): boolean {
  return row.pass_rate_percent !== null && row.pass_sample >= MIN_PASS_SAMPLE;
}

/**
 * Sort value for a nullable metric.
 *
 * "No data" must not sort as 0, or every unassessed course piles up at the
 * bottom of an ascending pass-rate sort looking like the worst performers.
 * -1 keeps them together and out of the ranked band.
 */
export function nullableSortValue(value: number | null): number {
  return value ?? -1;
}

/**
 * Days since a course last saw any activity, or null if it never has.
 *
 * Used for the "dormant" hint. Reading from an ISO string rather than a
 * server-computed count so the boundary follows the viewer's clock.
 */
export function daysSince(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((now.getTime() - then) / 86_400_000);
}

/**
 * Roster share at risk, 0-1. Zero when the course has no students —
 * dividing by an empty roster would be either NaN or Infinity, both of
 * which sort unpredictably.
 */
export function atRiskShare(row: CourseHealthRow): number {
  return row.students > 0 ? row.at_risk_students / row.students : 0;
}
