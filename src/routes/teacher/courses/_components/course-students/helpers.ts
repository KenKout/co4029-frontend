import type { RosterStudent } from "@/lib/api/types/teacher";

import { RISK_LEVELS, RISK_META } from "./constants";
import type { RiskBreakdownEntry, StatusFilter } from "./types";

/**
 * Pure roster helpers, moved verbatim out of the former 658-line
 * course-students.tsx. Same inputs, same outputs, same ordering — the only
 * change is that they now live outside the page component.
 */

/* ── Avatar initials + colour: shared helpers from ui/avatar ── */

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
  return `${Math.floor(days / 7)}w ago`;
}

/** Status bucket + free-text narrowing, in the original order. */
export function narrowRosterStudents(
  students: RosterStudent[],
  statusFilter: StatusFilter,
  search: string,
): RosterStudent[] {
  let list = students;

  if (statusFilter === "at_risk") {
    list = list.filter(
      (s) => s.at_risk_level === "medium" || s.at_risk_level === "high",
    );
  } else if (statusFilter !== "all") {
    list = list.filter((s) => s.enrollment_status === statusFilter);
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(
      (s) =>
        s.display_name.toLowerCase().includes(q) ||
        s.primary_email.toLowerCase().includes(q),
    );
  }

  return list;
}

/** Per-risk-level counts + percentages for the Cohort Overview card. */
export function buildRiskBreakdown(
  students: RosterStudent[],
): RiskBreakdownEntry[] {
  return RISK_LEVELS.map((level) => ({
    level,
    meta: RISK_META[level],
    count: students.filter((s) => s.at_risk_level === level).length,
    pct: students.length
      ? Math.round(
          (students.filter((s) => s.at_risk_level === level).length /
            students.length) *
            100,
        )
      : 0,
  }));
}
