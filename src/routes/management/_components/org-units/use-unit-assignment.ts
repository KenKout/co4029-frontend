import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useAddFacultyMembers,
  useFacultyAssignments,
  useOrganizationMemberships,
  useRemoveFacultyMember,
} from "@/lib/api/hooks/admin-organizations";
import { useUsersByIds } from "@/lib/api/hooks/admin";
import { apiPost } from "@/lib/api/client";
import type { RoleAssignmentRead } from "@/lib/api/types";

export interface UnitPerson {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
  facultyIds: string[];
  roleCodesByFaculty: Record<string, string[]>;
  roles: string[];
}

/** Direct staff affiliations for one Faculty; Course ownership is immutable. */
export function useUnitAssignment(
  orgId: string | undefined,
  facultyId: string | null,
) {
  const memberships = useOrganizationMemberships(orgId);
  const assignments = useFacultyAssignments(orgId);
  const addMembers = useAddFacultyMembers(orgId, facultyId);
  const removeMember = useRemoveFacultyMember(orgId, facultyId);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const activeMemberships = useMemo(
    () => (memberships.data ?? []).filter((row) => row.status === "active"),
    [memberships.data],
  );
  const users = useUsersByIds(activeMemberships.map((row) => row.user_id));
  const usersById = useMemo(() => {
    const map = new Map<
      string,
      {
        profile?: { display_name?: string | null } | null;
        primary_email?: string;
        roles?: string[];
      }
    >();
    for (const user of users.data ?? []) map.set(user.id, user);
    return map;
  }, [users.data]);

  const facultyIdsByUser = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of assignments.data ?? []) {
      const current = map.get(row.user_id) ?? [];
      current.push(row.faculty_id);
      map.set(row.user_id, current);
    }
    return map;
  }, [assignments.data]);

  const facultyRoleCodesByUser = useMemo(() => {
    const map = new Map<string, Record<string, string[]>>();
    for (const row of assignments.data ?? []) {
      const current = map.get(row.user_id) ?? {};
      current[row.faculty_id] = row.role_codes;
      map.set(row.user_id, current);
    }
    return map;
  }, [assignments.data]);

  const allOrganizationPeople = useMemo<UnitPerson[]>(
    () =>
      activeMemberships
        .map((membership) => {
          const user = usersById.get(membership.user_id);
          return {
            membershipId: membership.id,
            userId: membership.user_id,
            displayName:
              user?.profile?.display_name ??
              user?.primary_email ??
              membership.user_id,
            email: user?.primary_email ?? "",
            facultyIds: facultyIdsByUser.get(membership.user_id) ?? [],
            roleCodesByFaculty:
              facultyRoleCodesByUser.get(membership.user_id) ?? {},
            roles: user?.roles ?? [],
          };
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [activeMemberships, facultyIdsByUser, facultyRoleCodesByUser, usersById],
  );

  const allPeople = useMemo(
    () =>
      allOrganizationPeople.filter((person) =>
        person.roles.some((role) =>
          ["hod", "manager", "teacher"].includes(role),
        ),
      ),
    [allOrganizationPeople],
  );

  const deanCandidates = useMemo(
    () =>
      allOrganizationPeople.filter(
        (person) =>
          !person.roles.includes("student") && !person.roles.includes("admin"),
      ),
    [allOrganizationPeople],
  );

  const appointDean = useMutation({
    mutationFn: (userId: string) => {
      if (!orgId || !facultyId) {
        throw new Error("Select a Faculty before appointing its Dean");
      }
      return apiPost<RoleAssignmentRead>(`/admin/users/${userId}/assignments`, {
        role_code: "hod",
        scope_kind: "org_unit",
        organization_id: orgId,
        org_unit_id: facultyId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [
          "admin",
          "organizations",
          orgId ?? "",
          "faculty-assignments",
        ],
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      void queryClient.invalidateQueries({ queryKey: ["manager", "users"] });
    },
  });

  const peopleInUnit = useMemo(
    () =>
      facultyId
        ? allPeople.filter((person) => person.facultyIds.includes(facultyId))
        : [],
    [allPeople, facultyId],
  );

  async function assignPeople(userIds: string[]) {
    setError(null);
    try {
      await addMembers.mutateAsync(userIds);
    } catch (cause) {
      setError(messageOf(cause));
      throw cause;
    }
  }

  async function appointFacultyDeans(userIds: string[]) {
    setError(null);
    try {
      for (const userId of userIds) {
        await appointDean.mutateAsync(userId);
      }
    } catch (cause) {
      setError(messageOf(cause));
      throw cause;
    }
  }

  function removePerson(userId: string) {
    setError(null);
    removeMember.mutate(userId, {
      onError: (cause) => setError(messageOf(cause)),
    });
  }

  return {
    membershipsLoading:
      memberships.isLoading || assignments.isLoading || users.isLoading,
    peopleInUnit,
    allPeople,
    deanCandidates,
    assignPeople,
    appointFacultyDeans,
    removePerson,
    isAssigningPerson: removeMember.isPending,
    isBulkAssigning: addMembers.isPending,
    isAppointingDean: appointDean.isPending,
    error,
    setError,
  };
}

export function useUnitCounts(orgId: string | undefined) {
  const assignments = useFacultyAssignments(orgId);
  const peopleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of assignments.data ?? []) {
      counts.set(row.faculty_id, (counts.get(row.faculty_id) ?? 0) + 1);
    }
    return counts;
  }, [assignments.data]);
  return { peopleCounts, courseCounts: new Map<string, number>() };
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
