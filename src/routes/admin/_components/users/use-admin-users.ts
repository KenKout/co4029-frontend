import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useFormatDate } from "@/lib/format/date";
import { useServerTable } from "@/lib/api/use-server-table";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { useListRoles } from "@/lib/api/hooks/admin";
import { useOrganizations } from "@/lib/api/hooks/admin-organizations";

import type { UserWithRoles } from "./types";
import { buildUserColumns } from "./users-columns";

/**
 * Permission gate, role/org catalogs, the server-side table and the column
 * definitions for the admin users list.
 *
 * Hook call order is identical to the original component body: navigate →
 * translation → date formatter → permissions → permission requirement → roles
 * query → roleOptions memo → labelFor memo → orgs query → server table →
 * columns memo.
 */
export function useAdminUsers() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");

  useRequirePermission(canAdmin, {
    messageKey: "common.no_permission",
  });

  // Role list drives both the filter dropdown and the code→name label map for
  // the Role column, so the labels stay in sync with the seeded catalog.
  const roles = useListRoles();
  const roleOptions = useMemo(
    () => (roles.data ?? []).map((r) => r.role),
    [roles.data],
  );
  const labelFor = useMemo(() => {
    const byCode = new Map(roleOptions.map((r) => [r.code, r.name]));
    return (code: string) => byCode.get(code) ?? code;
  }, [roleOptions]);

  // Organization list drives the org filter dropdown (id → name).
  const orgs = useOrganizations({ limit: 200 });
  const orgOptions = orgs.items ?? [];

  // Server-side search + sort + role/org filter + page across the whole set.
  const table = useServerTable<UserWithRoles>({
    queryKey: ["admin", "users", "search"],
    path: "/users/search",
    pageSize: 25,
    enabled: !permissions.isLoading && canAdmin,
  });

  const columns = useMemo(
    () => buildUserColumns(t, labelFor, formatDate),
    [t, labelFor, formatDate],
  );

  return {
    navigate,
    t,
    permissionsLoading: permissions.isLoading,
    canAdmin,
    roleOptions,
    orgOptions,
    table,
    columns,
  };
}

export type AdminUsersController = ReturnType<typeof useAdminUsers>;
