/**
 * Locale-aware "3 minutes ago" formatting via `Intl.RelativeTimeFormat`.
 *
 * Why Intl rather than an i18n key per unit: the plural rules and the
 * past/future wording differ per language (vi has no plural -s at all), and
 * `Intl.RelativeTimeFormat` already ships those rules in the browser. Adding
 * `time_ago.minutes_one/other` keys per locale would re-implement CLDR by hand
 * and would drift — see the i18n note that this project does NOT auto-plural.
 *
 * Distinct from `formatRelativeInterviewTime`, which renders an ELAPSED
 * duration inside a session (`1:05`); this renders a point in the past
 * relative to now.
 */

/** Largest-unit thresholds, seconds → Intl unit. Ordered coarse→fine. */
const DIVISIONS: { limit: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { limit: 60, unit: "second" },
  { limit: 3600, unit: "minute" },
  { limit: 86_400, unit: "hour" },
  { limit: 604_800, unit: "day" },
  { limit: 2_629_800, unit: "week" },
  { limit: 31_557_600, unit: "month" },
  { limit: Number.POSITIVE_INFINITY, unit: "year" },
];

const SECONDS_PER_UNIT: Record<string, number> = {
  second: 1,
  minute: 60,
  hour: 3600,
  day: 86_400,
  week: 604_800,
  month: 2_629_800,
  year: 31_557_600,
};

/**
 * `timestamp` → e.g. "5 minutes ago" / "5 phút trước".
 *
 * Anything under a minute old collapses to the caller-supplied `justNow`
 * label, because "3 seconds ago" churns on every render and reads as noise.
 * An unparseable timestamp returns `null` so the caller can fall back to the
 * absolute date rather than printing "Invalid Date ago".
 */
export function timeAgo(
  timestamp: string | number | Date,
  locale: string,
  opts?: { justNow?: string },
): string | null {
  const then = new Date(timestamp).getTime();
  if (!Number.isFinite(then)) return null;

  const diffSeconds = (Date.now() - then) / 1000;
  // Clock skew (a row stamped a few seconds in the future) reads as "just now"
  // rather than "in 4 seconds".
  if (diffSeconds < 60) return opts?.justNow ?? "just now";

  const division =
    DIVISIONS.find((d) => diffSeconds < d.limit) ??
    DIVISIONS[DIVISIONS.length - 1];
  const value = Math.round(diffSeconds / SECONDS_PER_UNIT[division.unit]);

  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      -value,
      division.unit,
    );
  } catch {
    // An exotic/unsupported locale tag must not break the thread render.
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      -value,
      division.unit,
    );
  }
}

export { DIVISIONS as TIME_AGO_DIVISIONS };
