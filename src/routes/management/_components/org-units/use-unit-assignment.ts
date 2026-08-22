import { useMemo, useState } from "react";
import {
  useOrganizationMemberships,
  usePatchMembership,
} from "@/lib/api/hooks/admin-organizations";
import { useUsersByIds } from "@/lib/api/hooks/admin";
import { useDeptCourses } from "@/lib/api/hooks/dept";
import { useUpdateCourse } from "@/lib/api/hooks/teacher-courses";

/**
 * `{unitId: count}` for every unit, from data the page already loads.
 *
 * Counts are DIRECT members, matching the assignment panel rather than the
 * subtree-based scope links — the columns exist to answer "is this unit
 * itself still empty", and rolling descendants up would hide an empty
 * faculty whose departments are full.
 */
export function useUnitCounts(orgId: string | undefined) {
  const memberships = useOrganizationMemberships(orgId);
  const courses = useDeptCourses();

  const peopleCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of memberships.data ?? []) {
      if (row.status !== "active" || !row.org_unit_id) continue;
      m.set(row.org_unit_id, (m.get(row.org_unit_id) ?? 0) + 1);
    }
    return m;
  }, [memberships.data]);

  const courseCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of courses.data ?? []) {
      if (!c.org_unit_id) continue;
      m.set(c.org_unit_id, (m.get(c.org_unit_id) ?? 0) + 1);
    }
    return m;
  }, [courses.data]);

  return { peopleCounts, courseCounts };
}

export interface UnitPerson {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
}

/**
 * What is *in* a unit, and how to put things there.
 *
 * The org tree was navigable before this but not fillable: nothing in the UI
 * set `courses.org_unit_id` or `organization_memberships.org_unit_id`, so
 * every unit stayed empty and the scope filters had nothing to filter.
 *
 * Both writes use endpoints that already existed — `PATCH /teacher/courses/{id}`
 * (`org_unit_id` is a manager-only field) and
 * `PATCH /admin/organization-memberships/{id}`. Only the surface was missing.
 *
 * Membership shows people whose membership points at **exactly** this unit,
 * not the subtree. Subtree is the right lens for "who does this scope cover"
 * (what the filters answer) but the wrong one for assignment: a person listed
 * under a faculty because they sit in one of its departments has no meaningful
 * "remove from this unit" action.
 */
export function useUnitAssignment(orgId: string | undefined, unitId: string | null) {
  const memberships = useOrganizationMemberships(orgId);
  const patchMembership = usePatchMembership(orgId ?? "");
  const courses = useDeptCourses();

  const [error, setError] = useState<string | null>(null);

  // `MembershipRead` carries only `user_id`, so names come from a batch
  // lookup. Without it this panel would list raw UUIDs.
  const activeMemberships = useMemo(
    () => (memberships.data ?? []).filter((m) => m.status === "active"),
    [memberships.data],
  );
  const userIds = useMemo(
    () => activeMemberships.map((m) => m.user_id),
    [activeMemberships],
  );
  const users = useUsersByIds(userIds);

  const usersById = useMemo(() => {
    const map = new Map<string, { display_name?: string | null; primary_email?: string }>();
    for (const u of users.data ?? []) map.set(u.id, u);
    return map;
  }, [users.data]);

  function toPerson(m: { id: string; user_id: string }): UnitPerson {
    const u = usersById.get(m.user_id);
    return {
      membershipId: m.id,
      userId: m.user_id,
      displayName: u?.display_name ?? u?.primary_email ?? m.user_id,
      email: u?.primary_email ?? "",
    };
  }

  const peopleInUnit = useMemo(
    () =>
      unitId
        ? activeMemberships
            .filter((m) => m.org_unit_id === unitId)
            .map(toPerson)
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeMemberships, unitId, usersById],
  );

  /** Everyone in the org not already in this unit — the "add" candidates. */
  const assignablePeople = useMemo(
    () =>
      unitId
        ? activeMemberships
            .filter((m) => m.org_unit_id !== unitId)
            .map(toPerson)
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeMemberships, unitId, usersById],
  );

  const coursesInUnit = useMemo(
    () =>
      unitId
        ? (courses.data ?? []).filter((c) => c.org_unit_id === unitId)
        : [],
    [courses.data, unitId],
  );

  const assignableCourses = useMemo(
    () =>
      unitId
        ? (courses.data ?? []).filter((c) => c.org_unit_id !== unitId)
        : [],
    [courses.data, unitId],
  );

  function assignPerson(membershipId: string, targetUnitId: string | null) {
    setError(null);
    patchMembership.mutate(
      { membershipId, body: { org_unit_id: targetUnitId } },
      { onError: (e) => setError(messageOf(e)) },
    );
  }

  return {
    isLoading: memberships.isLoading || courses.isLoading,
    peopleInUnit,
    assignablePeople,
    coursesInUnit,
    assignableCourses,
    assignPerson,
    isAssigningPerson: patchMembership.isPending,
    error,
    setError,
  };
}

/**
 * Assigning a course is a per-course mutation, so the hook has to be created
 * per course id — hence a tiny component-level hook rather than a function on
 * the controller above (React hooks cannot be called in a loop body).
 */
export function useAssignCourseToUnit(
  courseId: string,
  onError: (message: string) => void,
) {
  const update = useUpdateCourse(courseId);
  return {
    isPending: update.isPending,
    assign: (orgUnitId: string | null) =>
      update.mutate(
        { org_unit_id: orgUnitId },
        { onError: (e) => onError(messageOf(e)) },
      ),
  };
}

function messageOf(error: unknown): string {
  const body = (error as { parsedBody?: unknown })?.parsedBody;
  const detail = (body as { detail?: unknown } | undefined)?.detail;
  if (detail && typeof detail === "object") {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  if (typeof detail === "string") return detail;
  return (error as Error)?.message ?? "Request failed";
}
