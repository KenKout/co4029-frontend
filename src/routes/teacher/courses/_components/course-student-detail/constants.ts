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
    label: "teacher_course_student_detail.risk.on_track",
    badge: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
  },
  low: {
    label: "teacher_course_student_detail.risk.low",
    badge: "bg-blue-100 text-blue-700",
    bar: "bg-blue-400",
  },
  medium: {
    label: "teacher_course_student_detail.risk.at_risk",
    badge: "bg-amber-100 text-amber-700",
    bar: "bg-amber-500",
  },
  high: {
    label: "teacher_course_student_detail.risk.high",
    badge: "bg-red-100 text-red-700",
    bar: "bg-red-500",
  },
};

export const ENROLL_META: Record<string, { label: string; badge: string }> = {
  active: {
    label: "teacher_course_student_detail.enrollment.active",
    badge: "bg-emerald-100 text-emerald-700",
  },
  completed: {
    label: "teacher_course_student_detail.enrollment.completed",
    badge: "bg-m3-primary-fixed text-m3-primary",
  },
  dropped: {
    label: "teacher_course_student_detail.enrollment.dropped",
    badge: "bg-slate-100 text-slate-500",
  },
  waitlisted: {
    label: "teacher_course_student_detail.enrollment.waitlist",
    badge: "bg-amber-100 text-amber-700",
  },
};

/** "Result" dropdown of the Interview Attempts filters. */
export const INTERVIEW_RESULT_OPTIONS = [
  { value: "all", label: "teacher_course_student_detail.filters.all_results" },
  { value: "passed", label: "teacher_course_student_detail.filters.passed" },
  { value: "not_passed", label: "teacher_course_student_detail.filters.not_passed" },
  { value: "evaluating", label: "teacher_course_student_detail.filters.evaluating" },
  { value: "in_progress", label: "teacher_course_student_detail.filters.in_progress" },
  { value: "failed", label: "teacher_course_student_detail.filters.evaluation_failed" },
  { value: "not_graded", label: "teacher_course_student_detail.filters.not_graded" },
];

/** "Time" dropdown of the Interview Attempts filters. */
export const INTERVIEW_TIME_OPTIONS = [
  { value: "all", label: "teacher_course_student_detail.filters.all_time" },
  { value: "today", label: "teacher_course_student_detail.filters.last_24_hours" },
  { value: "7", label: "teacher_course_student_detail.filters.last_7_days" },
  { value: "30", label: "teacher_course_student_detail.filters.last_30_days" },
  { value: "90", label: "teacher_course_student_detail.filters.last_90_days" },
];
