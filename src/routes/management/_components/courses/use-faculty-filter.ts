import { useEffect, useMemo, useRef, useState } from "react";

import {
  useFacultyAssignments,
  useOrgUnits,
} from "@/lib/api/hooks/admin-organizations";
import { useMe } from "@/lib/api/hooks/auth";

/**
 * Filter value for "courses with no faculty at all".
 *
 * Not a UUID, so it can never collide with a real faculty id. The list hook
 * maps it to the backend's ?faculty_id=none literal.
 */
export const UNASSIGNED_FACULTY = "__unassigned__";

/**
 * The faculty filter on the manager course worklist.
 *
 * The SELECT value drives a SERVER-side narrowing: the worklist hook passes
 * it as ?faculty_id= and the backend applies it inside the caller's resolved
 * scope, so picking a faculty refetches the list. This hook only owns the
 * state, the option set (the organization's faculties + always an
 * "Unassigned" entry) and the auto-default.
 *
 * Options used to be derived from the courses on the page — but the filter
 * now determines which courses are FETCHED, so deriving options from them is
 * circular. The organization's faculty list is the honest option set: an
 * org-scoped manager legitimately sees courses across every faculty. The
 * "Unassigned" entry is always present rather than conditioned on the visible
 * courses: when no course lacks a faculty it simply resolves to an empty
 * list, which is the honest answer for that pick.
 */
export interface FacultyFilterState {
  /** "all" or a faculty id (or UNASSIGNED_FACULTY). */
  value: string;
  setValue: (next: string) => void;
  /** Selectable faculties, label-sorted. */
  options: { value: string; label: string }[];
}

export function useFacultyFilter(
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

  const options = useMemo(() => {
    const named = (orgFaculties.data ?? [])
      .map((unit) => ({ value: unit.id, label: unit.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [...named, { value: UNASSIGNED_FACULTY, label: unassignedLabel }];
  }, [orgFaculties.data, unassignedLabel]);

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
