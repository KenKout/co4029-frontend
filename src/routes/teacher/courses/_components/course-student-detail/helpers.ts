import {
  Calendar,
  CheckCircle2,
  Clock,
  UserMinus,
  type LucideIcon,
} from "lucide-react";

import type { InterviewSessionTeacherRead } from "@/lib/api/types";
import type { RosterStudent } from "@/lib/api/types/teacher";

/**
 * Pure helpers of the per-student detail page, moved verbatim out of the former
 * 659-line course-student-detail.tsx. `interviewResultOf` and
 * `buildTimelineEntries` were inline expressions inside the page component —
 * naming them is what takes the page's complexity back under the threshold
 * without touching a single branch.
 */

export function relDate(iso: string | null) {
  if (!iso) return "Never";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** The session's bucket in the "Result" filter, unchanged from the inline form. */
export function interviewResultOf(s: InterviewSessionTeacherRead): string {
  return s.status === "in_progress"
    ? "in_progress"
    : s.status === "failed"
      ? "failed"
      : s.status === "abandoned"
        ? "not_graded"
        : s.pass_verdict === true
          ? "passed"
          : s.pass_verdict === false
            ? "not_passed"
            : "evaluating";
}

export interface TimelineEntry {
  icon: LucideIcon;
  color: string;
  bg: string;
  label: string;
  date: string;
  detail: string;
}

/** Enrollment timeline rows — enrolled, plus whichever milestones exist. */
export function buildTimelineEntries(student: RosterStudent): TimelineEntry[] {
  return [
    {
      icon: Calendar,
      color: "text-m3-primary",
      bg: "bg-m3-primary-fixed",
      label: "Enrolled",
      date: fmtDate(student.enrolled_at),
      detail: `Joined via ${student.enrollment_status === "waitlisted" ? "waitlist" : "direct enrollment"}`,
    },
    ...(student.last_activity_at
      ? [
          {
            icon: Clock,
            color: "text-m3-secondary",
            bg: "bg-m3-secondary-fixed",
            label: "Last Activity",
            date: relDate(student.last_activity_at),
            detail: `Last seen ${fmtDate(student.last_activity_at)}`,
          },
        ]
      : []),
    ...(student.completed_at
      ? [
          {
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            label: "Completed Course",
            date: fmtDate(student.completed_at),
            detail: student.final_grade
              ? `Final grade: ${student.final_grade}`
              : "No grade assigned",
          },
        ]
      : []),
    ...(student.dropped_at
      ? [
          {
            icon: UserMinus,
            color: "text-slate-500",
            bg: "bg-slate-100",
            label: "Dropped",
            date: fmtDate(student.dropped_at),
            detail: "Student dropped or was removed from the course",
          },
        ]
      : []),
  ];
}
