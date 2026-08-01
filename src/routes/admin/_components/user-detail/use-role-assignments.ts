import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import {
  useGrantUserAssignment,
  useListRoles,
  useRevokeUserAssignment,
} from "@/lib/api/hooks/admin";
import {
  useOrganizations,
  useOrgUnits,
} from "@/lib/api/hooks/admin-organizations";
import { useConfirm } from "@/components/ui/use-confirm";
import type { RoleAssignmentRead } from "@/lib/api/types";

import type { RoleAssignmentsController } from "./types";

/**
 * State + mutations behind the role-assignment section.
 *
 * Hook call order is identical to the original component body: translation →
 * roles catalog → grant → revoke → confirm → the five form fields → orgs →
 * org units → the org-reset effect → the three memos.
 */
export function useRoleAssignments(
  userId: string,
  assignments: RoleAssignmentRead[],
): RoleAssignmentsController {
  const { t } = useTranslation();
  const roles = useListRoles();
  const grant = useGrantUserAssignment(userId);
  const revoke = useRevokeUserAssignment(userId);
  const { confirm: confirmRevoke, dialog: confirmDialog } = useConfirm({
    title: t("admin.users.roles.revoke"),
    confirmLabel: t("admin.users.roles.revoke"),
    cancelLabel: t("common.cancel"),
  });

  const [roleCode, setRoleCode] = useState<string>("");
  const [scopeKind, setScopeKind] = useState<string>("organization");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [orgUnitId, setOrgUnitId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");

  // Organization + org-unit pickers for the assign-new-role form (replacing
  // raw UUID text inputs). Units load for the chosen org; changing the org
  // resets the selected unit so a stale cross-org unit can't be submitted.
  const orgs = useOrganizations({ limit: 200 });
  const orgOptions = orgs.items ?? [];
  const orgUnits = useOrgUnits(organizationId || undefined);
  const orgUnitOptions = orgUnits.data ?? [];

  useEffect(() => {
    setOrgUnitId("");
  }, [organizationId]);

  const roleOptions = useMemo(
    () => (roles.data ?? []).map((r) => r.role),
    [roles.data],
  );
  const roleByCode = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of roleOptions) m[r.id] = r.code;
    return m;
  }, [roleOptions]);

  // Grant is valid only when a role is chosen and the scope's required target
  // is filled. Used to disable the submit button instead of surfacing a toast
  // after the click — the user sees up front what's still needed.
  const isGrantValid = useMemo(() => {
    if (!roleCode) return false;
    if (scopeKind === "organization") return Boolean(organizationId.trim());
    if (scopeKind === "org_unit") return Boolean(orgUnitId.trim());
    if (scopeKind === "course") return Boolean(courseId.trim());
    return true; // global scope needs no target
  }, [roleCode, scopeKind, organizationId, orgUnitId, courseId]);

  const handleGrant = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // The submit button is disabled until the form is valid, so this is a
    // belt-and-suspenders guard (e.g. Enter-key submit) — no toast needed.
    if (!isGrantValid) return;
    grant.mutate(
      {
        role_code: roleCode,
        scope_kind: scopeKind as
          | "global"
          | "organization"
          | "org_unit"
          | "course",
        organization_id: organizationId.trim() || null,
        org_unit_id: orgUnitId.trim() || null,
        course_id: courseId.trim() || null,
        active_until: null,
      },
      {
        onSuccess: () => {
          toast.success(
            t("admin.users.roles.success.granted", { role: roleCode }),
          );
          setRoleCode("");
          setOrganizationId("");
          setOrgUnitId("");
          setCourseId("");
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("admin.users.roles.errors.grant_failed"),
          ),
      },
    );
  };

  const handleRevoke = (assignmentId: string, roleName: string) => {
    void confirmRevoke({
      description: t("admin.users.roles.revoke_confirm", {
        role: roleName,
      }),
    }).then((ok) => {
      if (!ok) return;
      revoke.mutate(assignmentId, {
        onSuccess: () => toast.success(t("admin.users.roles.success.revoked")),
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("admin.users.roles.errors.revoke_failed"),
          ),
      });
    });
  };

  return {
    t,
    assignments,
    roleOptions,
    roleByCode,
    orgOptions,
    orgUnitOptions,
    roleCode,
    setRoleCode,
    scopeKind,
    setScopeKind,
    organizationId,
    setOrganizationId,
    orgUnitId,
    setOrgUnitId,
    courseId,
    setCourseId,
    isGrantValid,
    grantIsPending: grant.isPending,
    revokeIsPending: revoke.isPending,
    handleGrant,
    handleRevoke,
    confirmDialog,
  };
}
