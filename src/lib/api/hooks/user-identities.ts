import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

/**
 * Batch user identities for avatar+name blocks (`UserIdentity`) on surfaces
 * whose API rows carry only `student_id` / `user_id` (+ maybe a bare name):
 * teacher assessments, course progress, sr-cohort / at-risk panels, admin
 * ai-costs. One `GET /users/by-ids` round-trip per distinct id-set (cached,
 * deduped, capped at the endpoint's 100-id limit like the admin hook).
 *
 * The endpoint org-scopes non-admin callers; a course's students share the
 * caller's org on every current deployment, and rows that come back
 * unresolvable simply render initials from the row's own display name.
 */
export function useUsersByIdentities(userIds: string[]) {
  const unique = useMemo(
    () => Array.from(new Set(userIds.filter(Boolean))).slice(0, 100),
    [userIds],
  );
  const idsKey = unique.join(",");
  return useQuery({
    // Same query key family as the admin hook: identical payload, shared cache.
    queryKey: ["admin", "users", "by-ids", idsKey] as const,
    queryFn: () =>
      apiFetch<User[]>(`/users/by-ids?ids=${encodeURIComponent(idsKey)}`),
    enabled: unique.length > 0,
    staleTime: 60 * 1000,
  });
}

/** id → User map for the identities fetched by `useUsersByIdentities`. */
export function useUsersByIdMap(userIds: string[]) {
  const { data } = useUsersByIdentities(userIds);
  return useMemo(() => {
    const map = new Map<string, User>();
    for (const u of data ?? []) map.set(u.id, u);
    return map;
  }, [data]);
}
