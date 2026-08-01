/**
 * Risk / status lookup tables and the interview-filter option lists of the
 * per-student detail page, moved verbatim out of the former 659-line
 * course-student-detail.tsx.
 */

/* ── Helpers ── */
export const RISK_META: Record<
  string,
  { label: string; badge: string; bar: string }
> = {
  none: {
    label: "On Track",
    badge: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
  },
  low: {
    label: "Low Risk",
    badge: "bg-blue-100 text-blue-700",
    bar: "bg-blue-400",
  },
  medium: {
    label: "At Risk",
    badge: "bg-amber-100 text-amber-700",
    bar: "bg-amber-500",
  },
  high: {
    label: "High Risk",
    badge: "bg-red-100 text-red-700",
    bar: "bg-red-500",
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

/** "Result" dropdown of the Interview Attempts filters. */
export const INTERVIEW_RESULT_OPTIONS = [
  { value: "all", label: "All results" },
  { value: "passed", label: "Passed" },
  { value: "not_passed", label: "Not passed" },
  { value: "evaluating", label: "Evaluating" },
  { value: "in_progress", label: "In progress" },
  { value: "failed", label: "Evaluation failed" },
  { value: "not_graded", label: "Not graded" },
];

/** "Time" dropdown of the Interview Attempts filters. */
export const INTERVIEW_TIME_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];
