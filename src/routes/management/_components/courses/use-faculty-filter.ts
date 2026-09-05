import { useEffect, useMemo, useRef, useState } from "react";

import {
  useFacultyAssignments,
  useOrgUnits,
} from "@/lib/api/hooks/admin-organizations";
import { useMe } from "@/lib/api/hooks/auth";
import type { CourseAuthoring } from "@/lib/api/types";

/**
 * Filter value for "courses with no faculty at all".
 *
 * Not a UUID, so it can never collide with a real faculty id. Needed because an
 * org-scoped manager's list legitimately contains unassigned courses — today
 * that is EVERY course — and without this the only way to see them would be
 * "All", mixed in with everything else.
 */
export const UNASSIGNED_FACULTY = "__unassigned__";

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
  /** Translated label for the "Unassigned" option; passed in so the hook stays
   *  free of i18n and the caller owns the wording. */
  unassignedLabel: string,
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

  /** Every faculty in the organization — the real option source. */
  const orgFaculties = useOrgUnits(me?.organization_id ?? undefined, {
    onlyRoots: true,
  });

  /**
   * Options come from the ORGANIZATION's faculties, plus whatever faculties the
   * visible courses actually reference.
   *
   * The first version derived options from the courses on the page only. That
   * was wrong twice over. An org-scoped manager legitimately sees courses across
   * every faculty, so the org list is the honest set of things they can filter
   * by — and because no course carries a faculty yet, "faculties seen on the
   * page" was EMPTY, which hid the control completely. The course-derived half is
   * kept as a union so a faculty that is somehow missing from the org list (a
   * cross-org course, a renamed unit) still gets an option rather than becoming
   * unfilterable.
   *
   * "Unassigned" is appended whenever any visible course has no faculty, which
   * is what makes today's data reachable as a group instead of only via "All".
   */
  const options = useMemo(() => {
    const seen = new Map<string, string>();
    for (const unit of orgFaculties.data ?? []) {
      seen.set(unit.id, unit.name);
    }
    for (const course of courses ?? []) {
      if (course.faculty_id && course.faculty_name) {
        seen.set(course.faculty_id, course.faculty_name);
      }
    }
    const named = [...seen.entries()]
      .map(([id, label]) => ({ value: id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const hasUnassigned = (courses ?? []).some((c) => !c.faculty_id);
    return hasUnassigned
      ? [...named, { value: UNASSIGNED_FACULTY, label: unassignedLabel }]
      : named;
  }, [courses, orgFaculties.data, unassignedLabel]);

  /**
   * Default to the caller's own faculty when they belong to exactly ONE, and to
   * "All" when they belong to several or none (user request 2026-09-05).
   *
   * Guarded by a ref so it runs once per mount rather than on every data settle —
   * otherwise a refetch would silently undo a manual pick.
   *
   * It deliberately does NOT require the faculty to appear on the visible
   * courses. An earlier version did, reasoning that defaulting to a faculty with
   * no courses opens on an empty table. That is the wrong trade: a dean of an
   * empty faculty should see their own empty faculty, not silently get every
   * other faculty's courses. The empty table is the honest answer, and the
   * dropdown shows which scope produced it.
   */
  const defaulted = useRef(false);
  useEffect(() => {
    if (defaulted.current) return;
    // Wait for the assignments query to settle; defaulting off `[]` while it is
    // still loading would latch "all" and never correct itself.
    if (facultyAssignments.isLoading) return;
    defaulted.current = true;
    if (myFacultyIds.length === 1) setValue(myFacultyIds[0]);
  }, [facultyAssignments.isLoading, myFacultyIds]);

  return { value, setValue, options };
}
