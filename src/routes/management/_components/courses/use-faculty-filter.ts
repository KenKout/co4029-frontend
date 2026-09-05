import { useEffect, useMemo, useRef, useState } from "react";

import { useFacultyAssignments } from "@/lib/api/hooks/admin-organizations";
import { useMe } from "@/lib/api/hooks/auth";
import type { CourseAuthoring } from "@/lib/api/types";

/**
 * The faculty filter on the manager course worklist.
 *
 * Extracted from `DeptCoursesPage` rather than inlined: that component already
 * breached the 150-line / complexity-15 lint caps before this feature, and the
 * filter is self-contained state with no other coupling to the page.
 *
 * The list is ALREADY scoped server-side by role assignment (GET /dept/courses
 * resolves faculty scope for a dean, organization scope for a manager), so this
 * filter only ever narrows within an authorised set — it cannot widen it, and
 * nothing here is a permission boundary.
 */
export interface FacultyFilterState {
  /** "all" or a faculty id. */
  value: string;
  setValue: (next: string) => void;
  /** Selectable faculties, label-sorted. Empty when no course has a faculty. */
  options: { value: string; label: string }[];
}

export function useFacultyFilter(
  courses: CourseAuthoring[] | undefined,
): FacultyFilterState {
  const { data: me } = useMe();
  const [value, setValue] = useState("all");

  const facultyAssignments = useFacultyAssignments(
    me?.organization_id ?? undefined,
  );

  /** Faculties the CALLER belongs to — used only to pick the opening value. */
  const myFacultyIds = useMemo(() => {
    const mine = (facultyAssignments.data ?? []).filter(
      (row) => row.user_id === me?.id,
    );
    return [...new Set(mine.map((row) => row.faculty_id))];
  }, [facultyAssignments.data, me?.id]);

  /**
   * Options come from the COURSES on the page, not the organization's faculty
   * list: a faculty with no courses here would be an option that always yields
   * an empty table.
   */
  const options = useMemo(() => {
    const seen = new Map<string, string>();
    for (const course of courses ?? []) {
      if (course.faculty_id && course.faculty_name) {
        seen.set(course.faculty_id, course.faculty_name);
      }
    }
    return [...seen.entries()]
      .map(([id, label]) => ({ value: id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [courses]);

  /**
   * Default to the caller's own faculty when they belong to exactly ONE, and to
   * "All" when they belong to several or none (user request 2026-09-05).
   *
   * Guarded by a ref so it runs once per mount instead of on every data
   * settle — otherwise a refetch would silently undo a manual pick. Also
   * requires the faculty to actually appear on the page, so the opening view is
   * never an unexplained empty table.
   */
  const defaulted = useRef(false);
  useEffect(() => {
    if (defaulted.current) return;
    if (myFacultyIds.length !== 1) return;
    const only = myFacultyIds[0];
    if (!options.some((option) => option.value === only)) return;
    defaulted.current = true;
    setValue(only);
  }, [myFacultyIds, options]);

  return { value, setValue, options };
}
