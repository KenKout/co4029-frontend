import type { StatusFilter } from "./types";

/**
 * Risk / status lookup tables and the two static option lists of the course
 * Students page, moved verbatim out of the former 658-line
 * course-students.tsx. Lookup maps rather than branch chains, which is also
 * what keeps the roster row free of an if/else ladder.
 */

/* ── Risk / status helpers ── */
export const RISK_META: Record<
  string,
  { label: string; badge: string; dot: string }
> = {
  none: {
    label: "On Track",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  low: {
    label: "Low Risk",
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-400",
  },
  medium: {
    label: "At Risk",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  high: {
    label: "High Risk",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
};

export const ENROLL_META: Record<string, { label: string; badge: string }> = {
  active: { label: "Active", badge: "bg-emerald-100 text-emerald-700" },
  completed: {
    label: "Completed",
    badge: "bg-m3-primary-fixed text-m3-primary",
  },
  dropped: { label: "Dropped", badge: "bg-slate-100 text-slate-500" },
  waitlisted: { label: "Waitlist", badge: "bg-amber-100 text-amber-700" },
};

export const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "at_risk", label: "At Risk" },
  { key: "completed", label: "Completed" },
  { key: "dropped", label: "Dropped" },
];

/** Risk levels in the order the Cohort Overview lists them. */
export const RISK_LEVELS = ["high", "medium", "low", "none"] as const;

/** Sort weights for the "Risk Level" sort key. */
export const RISK_SORT_ORDER = { high: 3, medium: 2, low: 1, none: 0 };
