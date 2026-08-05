import { useCallback, useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";

import type { SortState } from "@/components/ui/data-table";
import {
  useTeacherCourseById,
  useTeacherCourseRoster,
} from "@/lib/api/hooks/teacher-courses";
import type { RosterStudent } from "@/lib/api/types/teacher";

import { buildRiskBreakdown, narrowRosterStudents } from "./helpers";
import type { RiskBreakdownEntry, StatusFilter } from "./types";

/**
 * Columns whose FIRST click should sort descending. The old sort dropdown
 * compared `b - a` for progress / enrolled_at / risk, so "sort by progress"
 * meant "most progress first". DataTable's own header cycle always opens
 * ascending, which would have silently inverted all three — hence the
 * controlled sort state below rather than letting the table own it.
 */
const DESC_FIRST = new Set(["progress", "risk", "enrolled_at", "last_active"]);

/** The sort the page opens on — unchanged: most progress first. */
const DEFAULT_SORT: SortState = { columnId: "progress", direction: "desc" };

/**
 * Every piece of state and every derived value of the course Students page.
 *
 * Sorting used to be hand-rolled (a `SortKey` + `compareRosterStudents`) behind
 * a dropdown. It is now DataTable's built-in client sort, driven from clickable
 * headers, with the direction cycle owned here so each column keeps the
 * direction it always opened with.
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
  sort: SortState | null;
  onSortChange: (next: SortState | null) => void;
  filtered: RosterStudent[];
  riskBreakdown: RiskBreakdownEntry[];
}

export function useCourseStudentsController(): CourseStudentsController {
  // `strict: false` widens courseId to `string | undefined`; this route always
  // has it. The assertion is load-bearing (used unguarded below) — do NOT let
  // `eslint --fix` strip it as "unnecessary", it isn't.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  useTeacherCourseById(courseId);
  const { data: roster, isLoading } = useTeacherCourseRoster(courseId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortState | null>(DEFAULT_SORT);

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

  /**
   * Own the asc/desc/none cycle so a column can open descending.
   *
   * DataTable computes the next state from the current one and hands it over;
   * when it cycles off it passes `null`, which no longer names the clicked
   * column — so fall back to the previous column, which is the only one whose
   * header could have produced that.
   */
  const onSortChange = useCallback((next: SortState | null) => {
    setSort((prev) => {
      const clicked = next?.columnId ?? prev?.columnId;
      if (!clicked) return null;
      const first = DESC_FIRST.has(clicked) ? "desc" : "asc";
      const second = first === "desc" ? "asc" : "desc";
      if (!prev || prev.columnId !== clicked) {
        return { columnId: clicked, direction: first };
      }
      if (prev.direction === first) {
        return { columnId: clicked, direction: second };
      }
      return null;
    });
  }, []);

  /* ── Filter only; DataTable applies the sort via each column's sortValue ── */
  const filtered = useMemo<RosterStudent[]>(
    () => narrowRosterStudents(students, statusFilter, search),
    [students, statusFilter, search],
  );

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
    sort,
    onSortChange,
    filtered,
    riskBreakdown,
  };
}
