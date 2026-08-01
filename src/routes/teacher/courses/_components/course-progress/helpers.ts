import type { AtRiskListRead, RosterProgressRead } from "@/lib/api/types";
import type { CourseRoster } from "@/lib/api/types/teacher";

import type {
  AtRiskMap,
  ProgressRow,
  ProgressSummary,
  StudentNameMap,
} from "./types";

/**
 * Pure helpers of the course Progress tab, moved verbatim out of the former
 * 401-line course-progress.tsx. Same inputs, same outputs, same ordering.
 */

export function formatHours(seconds: number) {
  if (seconds <= 0) return "0h";
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.max(1, Math.round(seconds / 60))}m`;
  return `${hours.toFixed(1)}h`;
}

export function relDays(days: number | null) {
  if (days === null) return null;
  if (days < 1) return "today";
  if (days < 2) return "1d";
  return `${Math.round(days)}d`;
}

/** Roster gives us display_name + email; cohort gives per-lesson counts. */
export function buildStudentNameMap(
  roster: CourseRoster | undefined,
): StudentNameMap {
  const map: StudentNameMap = new Map();
  for (const s of roster?.students ?? []) {
    map.set(s.student_id, {
      name: s.display_name,
      email: s.primary_email,
    });
  }
  return map;
}

export function buildProgressRows(
  cohort: RosterProgressRead | undefined,
  studentNames: StudentNameMap,
): ProgressRow[] {
  return (cohort?.students ?? []).map((row) => {
    const meta = studentNames.get(row.user_id);
    return {
      ...row,
      completion_percent: Number(row.completion_percent),
      display_name: meta?.name ?? row.user_id.slice(0, 8),
      email: meta?.email ?? "",
    };
  });
}

export function summarizeProgress(rows: ProgressRow[]): ProgressSummary {
  const total = rows.length;
  const completed = rows.filter((r) => r.completion_percent >= 100).length;
  const inProgress = rows.filter(
    (r) =>
      r.in_progress_lessons > 0 ||
      (r.completed_lessons > 0 && r.completion_percent < 100),
  ).length;
  const notStarted = rows.filter(
    (r) => r.completed_lessons === 0 && r.in_progress_lessons === 0,
  ).length;
  const avgCompletion = total
    ? rows.reduce((acc, r) => acc + r.completion_percent, 0) / total
    : 0;
  const totalHours = rows.reduce((acc, r) => acc + r.total_time_seconds, 0);
  return {
    total,
    completed,
    inProgress,
    notStarted,
    avgCompletion,
    totalHours,
  };
}

export function buildAtRiskMap(
  atRisk: AtRiskListRead | undefined,
  noReasonLabel: string,
): AtRiskMap {
  const map: AtRiskMap = new Map();
  for (const s of atRisk?.students ?? []) {
    const reason =
      s.reasons?.[0]?.detail ?? s.reasons?.[0]?.code ?? noReasonLabel;
    map.set(s.user_id, {
      reason,
      days: s.days_since_last_engagement,
    });
  }
  return map;
}
