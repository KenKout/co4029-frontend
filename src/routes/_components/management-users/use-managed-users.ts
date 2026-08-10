import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useFormatDate } from "@/lib/format/date";
import { useServerTable } from "@/lib/api/use-server-table";
import { usePermissions } from "@/lib/auth/use-permissions";
import { apiDelete, apiFetch, apiPost } from "@/lib/api/client";
import { useListRoles } from "@/lib/api/hooks/admin";
import type { RoleAssignmentRead } from "@/lib/api/types";

import type { UserWithRoles } from "@/routes/admin/_components/users/types";
import { buildUserColumns } from "@/routes/admin/_components/users/users-columns";

/**
 * Manager-facing org user administration (org-scoped account management).
 *
 * Rows come from the identity ``/users/search`` endpoint — the same one that
 * backs the admin users DataTable — so this screen shares its search, role
 * filter, sort and pagination. The backend forces the org scope server-side
 * (a non-admin caller's ``organization`` param is ignored and replaced with
 * their own primary org), so the manager never picks an org: there is only
 * theirs.
 *
 * Actions (disable / enable) go through the org-scoped
 * ``/admin/users/{id}/disable|enable`` endpoints, which re-assert the same
 * guards (self, org membership, peer manager/hod/admin) on the backend — the
 * UI hides the action on peer rows, the backend forbids it.
 */

export function useManagedUsers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const permissions = usePermissions();
  const canManage = permissions.has("user.disable");

  const roles = useListRoles();
  const roleOptions = useMemo(
    () => (roles.data ?? []).map((r) => r.role),
    [roles.data],
  );
  const labelFor = useMemo(() => {
    const byCode = new Map(roleOptions.map((r) => [r.code, r.name]));
    return (code: string) => byCode.get(code) ?? code;
  }, [roleOptions]);

  // Same server table as the admin users page: search + role filter + sort +
  // page. No org filter — the backend forces the caller's org.
  const table = useServerTable<UserWithRoles>({
    queryKey: ["manager", "users", "search"],
    path: "/users/search",
    pageSize: 25,
    enabled: !permissions.isLoading && permissions.has("user.read"),
  });

  const columns = useMemo(
    () => buildUserColumns(t, labelFor, formatDate),
    [t, labelFor, formatDate],
  );

  const qc = useQueryClient();
  const invalidate = () => {
    // Prefix match: kills every page/filter variant of the manager table.
    void qc.invalidateQueries({ queryKey: ["manager", "users"] });
  };

  const disable = useMutation({
    mutationFn: (userId: string) =>
      apiPost<{ user_id: string; status: string }>(
        `/admin/users/${userId}/disable`,
      ),
    onSuccess: invalidate,
  });

  const enable = useMutation({
    mutationFn: (userId: string) =>
      apiPost<{ user_id: string; status: string }>(
        `/admin/users/${userId}/enable`,
      ),
    onSuccess: invalidate,
  });

  // HOD (user.role_assign.hod) or admin may promote/revoke managers inside
  // their org. The backend re-asserts both the HOD gate and the org scope.
  const canAssignManager =
    permissions.has("user.role_assign.hod") ||
    permissions.has("system.administer");

  const managerRoleId = useMemo(
    () =>
      roleOptions.find((r) => r.code === "manager")?.id ?? null,
    [roleOptions],
  );

  const grantManager = useMutation({
    mutationFn: ({ userId, orgId }: { userId: string; orgId: string }) =>
      apiPost<RoleAssignmentRead>(`/admin/users/${userId}/assignments`, {
        role_code: "manager",
        scope_kind: "organization",
        organization_id: orgId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["manager", "users"] });
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const revokeManager = useMutation({
    mutationFn: async ({ userId, orgId }: { userId: string; orgId: string }) => {
      // The table row only carries role codes; resolve the manager
      // assignment id for THIS org before deleting.
      if (!managerRoleId) {
        throw new Error(t("management_users.errors.role_catalog", { defaultValue: "Role catalog not loaded" }));
      }
      const assignments = await apiFetch<RoleAssignmentRead[]>(
        `/admin/users/${userId}/assignments`,
      );
      const target = assignments.find(
        (a) => a.role_id === managerRoleId && a.organization_id === orgId,
      );
      if (!target) {
        throw new Error(t("management_users.errors.no_manager_assignment", { defaultValue: "No manager assignment found" }));
      }
      return apiDelete(`/admin/users/${userId}/assignments/${target.id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["manager", "users"] });
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  return {
    t,
    navigate,
    formatDate,
    permissionsLoading: permissions.isLoading,
    canRead: permissions.has("user.read"),
    canManage,
    canAssignManager,
    labelFor,
    roleOptions,
    table,
    columns,
    disable: (userId: string) => disable.mutate(userId),
    enable: (userId: string) => enable.mutate(userId),
    grantManager: (userId: string, orgId: string) =>
      grantManager.mutate({ userId, orgId }),
    revokeManager: (userId: string, orgId: string) =>
      revokeManager.mutate({ userId, orgId }),
    grantPending: grantManager.isPending,
    revokePending: revokeManager.isPending,
    pendingUserId: disable.isPending
      ? disable.variables ?? null
      : enable.isPending
        ? enable.variables ?? null
        : null,
  };
}

export type ManagedUsersController = ReturnType<typeof useManagedUsers>;
