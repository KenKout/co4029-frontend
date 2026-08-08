import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch, apiPost } from "../client";
import { queryKeys } from "../query-keys";

/**
 * Manager-facing org user administration (org-scoped account management).
 *
 * The endpoint is the admin feature's ``GET /admin/users``: it resolves the
 * caller's organization server-side via ``resolve_admin_scope`` (manager →
 * their org; IT admin → global) and now returns ``role_codes`` so the UI can
 * badge manager/teacher/student rows and hide the disable action on peer
 * rows. The committed OpenAPI snapshot predates the ``role_codes`` field, so
 * the row type is widened locally (same pattern as the admin users table).
 */

/** Cursor-paginated page returned by ``GET /admin/users``. */
export interface ManagedOrgUserRow {
  user_id: string;
  primary_email: string;
  status: string;
  display_name: string | null;
  last_login_at: unknown;
  created_at: unknown;
  updated_at: unknown;
  role_codes: string[];
}

interface ManagedOrgUserPage {
  items: ManagedOrgUserRow[];
  next_cursor: string | null;
}

export interface ManagedOrgUsersController {
  items: ManagedOrgUserRow[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  disable: (userId: string) => void;
  enable: (userId: string) => void;
  pendingUserId: string | null;
}

export function useManagedOrgUsers(): ManagedOrgUsersController {
  const qc = useQueryClient();

  const list = useInfiniteQuery<ManagedOrgUserPage>({
    queryKey: queryKeys.admin.users("managed-org"),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (typeof pageParam === "string" && pageParam.length > 0) {
        params.set("cursor", pageParam);
      }
      params.set("limit", "50");
      return apiFetch<ManagedOrgUserPage>(`/admin/users?${params.toString()}`);
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.admin.users("managed-org") });
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

  return {
    items,
    hasNextPage: list.hasNextPage ?? false,
    fetchNextPage: () => {
      void list.fetchNextPage();
    },
    isFetchingNextPage: list.isFetchingNextPage,
    isLoading: list.isLoading,
    isError: list.isError,
    disable: (userId) => disable.mutate(userId),
    enable: (userId) => enable.mutate(userId),
    pendingUserId: disable.isPending
      ? disable.variables ?? null
      : enable.isPending
        ? enable.variables ?? null
        : null,
  };
}
