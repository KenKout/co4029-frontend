import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { usePermissions } from "@/lib/auth/use-permissions";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { UserOverview } from "@/lib/api/types/user-overview";

/**
 * Manager/HOD user-detail page: fetch the org-scoped overview for one user.
 *
 * The backend returns identity always, plus role-dependent sections
 * (student → courses + career paths + last active; teacher → assigned
 * courses; manager/HOD/admin → identity only). The route is gated on
 * ``user.read`` — the same permission the users table requires — and the
 * backend 404s cross-org lookups, so there is nothing to hide here.
 */
export function useManagerUserDetail() {
  const { t } = useTranslation();
  const params = useParams({ strict: false }) as { userId?: string };
  const userId = params.userId ?? "";

  const permissions = usePermissions();
  const enabled = !permissions.isLoading && permissions.has("user.read") && Boolean(userId);
  const query = useQuery({
    queryKey: queryKeys.manager.userOverview(userId),
    queryFn: () => apiFetch<UserOverview>(`/users/${userId}/overview`),
    enabled,
  });

  return {
    t,
    userId,
    permissionsLoading: permissions.isLoading,
    canRead: permissions.has("user.read"),
    isLoading: permissions.isLoading || query.isLoading,
    isError: query.isError,
    data: query.data,
  };
}

export type ManagerUserDetailController = ReturnType<typeof useManagerUserDetail>;
