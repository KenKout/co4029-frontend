import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useOrganizationMemberships } from "@/lib/api/hooks/admin-organizations";
import type { User } from "@/lib/api/types";

/**
 * Stateful half of the memberships tab: the roster query, the org's user
 * catalog (drives avatars / names in the table), and client-side search.
 * Account creation now belongs exclusively to the Users invite flow; this
 * organization view intentionally has no attach-existing-user mutation.
 */
export function useMembershipsTab(orgId: string) {
  const { t, i18n } = useTranslation();
  const { data: members, isLoading } = useOrganizationMemberships(orgId);

  // The org's user catalog — one round-trip maps every membership user_id to
  // a display name + presigned avatar URL (admin user search). Memberships
  // carry only user_id, so without this the roster would be a list of UUIDs.
  const usersQuery = useQuery({
    queryKey: [
      ...queryKeys.admin.organizationMemberships(orgId),
      "users",
    ] as const,
    queryFn: () =>
      apiFetch<{ items: User[] }>(
        `/users/search?organization=${orgId}&page_size=200`,
      ).then((page) => page.items),
    enabled: Boolean(orgId),
  });
  const userById = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of usersQuery.data ?? []) map.set(u.id, u);
    return map;
  }, [usersQuery.data]);

  // Client-side search: filters the roster by the user's display name or
  // email (resolved through the catalog) so the toolbar works like the other
  // admin tables without a dedicated backend query.
  const [search, setSearch] = useState("");
  const filteredMembers = useMemo(() => {
    const rows = members ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((m) => {
      const u = userById.get(m.user_id);
      const haystack =
        `${u?.profile?.display_name ?? ""} ${u?.primary_email ?? ""} ${m.user_id}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [members, search, userById]);

  return {
    t,
    i18n,
    orgId,
    members,
    filteredMembers,
    isLoading,
    userById,
    search,
    setSearch,
  };
}

export type MembershipsTabController = ReturnType<typeof useMembershipsTab>;
