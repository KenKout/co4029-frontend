import { useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";

import {
  useTeacherCourseById,
  useTeacherCourseRoster,
} from "@/lib/api/hooks/teacher-courses";
import type { RosterStudent } from "@/lib/api/types/teacher";

import {
  buildRiskBreakdown,
  compareRosterStudents,
  narrowRosterStudents,
} from "./helpers";
import type { RiskBreakdownEntry, SortKey, StatusFilter } from "./types";

/**
 * Every piece of state and every derived value of the course Students page,
 * extracted from the former 658-line course-students.tsx. The hook sequence is
 * unchanged: params, the two queries, the three `useState` calls, then the one
 * `useMemo` with its original dependency array. Cohort stats and the risk
 * breakdown stay plain per-render computations, exactly as before.
 */
export interface CourseStudentsController {
  courseId: string;
  isLoading: boolean;
  students: RosterStudent[];
  activeCount: number;
  completedCount: number;
  atRiskCount: number;
  avgProgress: number;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  sortKey: SortKey;
  setSortKey: (value: SortKey) => void;
  filtered: RosterStudent[];
  riskBreakdown: RiskBreakdownEntry[];
}

export function useCourseStudentsController(): CourseStudentsController {
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  useTeacherCourseById(courseId);
  const { data: roster, isLoading } = useTeacherCourseRoster(courseId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("progress");

  const students = roster?.students ?? [];

  /* ── Cohort stats ── */
  const activeCount = students.filter(
    (s) => s.enrollment_status === "active",
  ).length;
  const completedCount = students.filter(
    (s) => s.enrollment_status === "completed",
  ).length;
  const atRiskCount = students.filter(
    (s) => s.at_risk_level === "medium" || s.at_risk_level === "high",
  ).length;
  const avgProgress = students.length
    ? Math.round(
        students.reduce((a, s) => a + s.progress_percent, 0) / students.length,
      )
    : 0;

  /* ── Filter + sort ── */
  const filtered = useMemo<RosterStudent[]>(() => {
    const list = narrowRosterStudents(students, statusFilter, search);
    return [...list].sort(compareRosterStudents(sortKey));
  }, [students, statusFilter, search, sortKey]);

  const riskBreakdown = buildRiskBreakdown(students);

  return {
    courseId,
    isLoading,
    students,
    activeCount,
    completedCount,
    atRiskCount,
    avgProgress,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortKey,
    setSortKey,
    filtered,
    riskBreakdown,
  };
}
