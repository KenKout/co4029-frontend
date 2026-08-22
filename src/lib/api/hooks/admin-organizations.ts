/**
 * TanStack Query hooks for the organization-management admin endpoints.
 *
 * Mirrors the API surface in
 * `abridgeai/features/access_control/routers/organizations.py`. All
 * mutations invalidate the relevant query keys so list pages stay in
 * sync after create/update/delete.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import { useInfinitePage } from "../use-infinite-page";
import type {
  MembershipCreate,
  MembershipPatch,
  MembershipRead,
  OrganizationCreate,
  OrganizationDomainCreate,
  OrganizationDomainPatch,
  OrganizationDomainRead,
  OrganizationPatch,
  OrganizationRead,
  OrgUnitCreate,
  OrgUnitPatch,
  OrgUnitRead,
} from "../types/admin-organizations";

// ---------------------------------------------------------------------------
// Admin user search (for membership add typeahead)
// ---------------------------------------------------------------------------

/**
 * Search row returned by `/admin/users` with the `q=` filter applied.
 *
 * Mirrors `UserListRow` in the backend (admin/routers/users.py) — the
 * organization-membership search uses this shape directly so we don't pay
 * for the heavier `UserRead` profile join.
 */
export interface AdminUserSearchRow {
  user_id: string;
  primary_email: string;
  status: string;
  display_name: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Server-side admin-users search for pickers and the membership combobox.
 *
 * Hits the page-numbered `/users/search` endpoint (identity router — the
 * same one the admin users table uses), which actually implements
 * server-side filtering (`search` against email/display name, `status`,
 * optional `role`). The cursor `/admin/users` endpoint declares only
 * cursor/limit, and `/admin/users/search` does NOT exist — that prefix is a
 * separate admin router whose `/{user_id}` route would capture "search" as
 * a UUID (422). Non-admin callers are scoped to their own primary
 * organization by the backend.
 *
 * Empty query returns the first 20 active users so the dropdown has
 * something to render on focus. Pass `role` (e.g. "student") to restrict
 * results to holders of that role — the career-path student picker uses it
 * so only student accounts are enrollable.
 */
export function useAdminUsersSearch(
  query: string,
  enabled = true,
  role?: string,
) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["admin", "users", "search", trimmed, role ?? "any"] as const,
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("status", "active");
      qs.set("page_size", "20");
      if (trimmed.length > 0) qs.set("search", trimmed);
      if (role) qs.set("role", role);
      const page = await apiFetch<{
        items: Array<{
          id: string;
          primary_email: string;
          status: string;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
          profile: { display_name: string | null } | null;
        }>;
        total: number;
        total_pages: number;
      }>(`/users/search?${qs.toString()}`);
      // /users/search returns identity UserRead (nested profile, `id` field);
      // flatten to the AdminUserSearchRow shape the comboboxes already use.
      return page.items.map((u) => ({
        user_id: u.id,
        primary_email: u.primary_email,
        status: u.status,
        display_name: u.profile?.display_name ?? null,
        last_login_at: u.last_login_at,
        created_at: u.created_at,
        updated_at: u.updated_at,
      }));
    },
    staleTime: 1000 * 15,
    enabled,
  });
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export interface OrganizationListParams {
  includeDeleted?: boolean;
  orgStatus?: string;
  limit?: number;
}

export interface OrganizationListPage {
  items: OrganizationRead[];
  next_cursor: string | null;
}

/**
 * Cursor-paginated organisation list (Reconciliation §A10/§D2).
 *
 * Returns a flattened `items[]` plus standard infinite-scroll handles
 * (`hasNextPage` / `fetchNextPage` / `isFetchingNextPage`) — pair with
 * `<InfiniteList>` so the table auto-loads as the user scrolls.
 */
export function useOrganizations(params: OrganizationListParams = {}) {
  const { includeDeleted, orgStatus, limit = 50 } = params;
  return useInfinitePage<OrganizationRead>({
    queryKey: queryKeys.admin.organizations(includeDeleted, orgStatus, limit),
    fetch: async (cursor, pageLimit = limit) => {
      const qs = new URLSearchParams();
      if (includeDeleted) qs.set("include_deleted", "true");
      if (orgStatus) qs.set("org_status", orgStatus);
      if (pageLimit) qs.set("limit", String(pageLimit));
      if (cursor) qs.set("cursor", cursor);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      const page = await apiFetch<OrganizationListPage>(
        `/admin/organizations${suffix}`,
      );
      return { items: page.items, next_cursor: page.next_cursor ?? null };
    },
    limit,
  });
}

export function useOrganization(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.organizationDetail(orgId ?? ""),
    queryFn: () => apiFetch<OrganizationRead>(`/admin/organizations/${orgId}`),
    enabled: Boolean(orgId),
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrganizationCreate) =>
      apiPost<OrganizationRead>(`/admin/organizations`, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin", "organizations"] as const,
      });
    },
  });
}

export function usePatchOrganization(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrganizationPatch) =>
      apiPatch<OrganizationRead>(`/admin/organizations/${orgId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin", "organizations"] as const,
      });
    },
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => apiDelete(`/admin/organizations/${orgId}`),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin", "organizations"] as const,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Organization domains
// ---------------------------------------------------------------------------

export function useOrganizationDomains(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.organizationDomains(orgId ?? ""),
    queryFn: () =>
      apiFetch<OrganizationDomainRead[]>(
        `/admin/organizations/${orgId}/domains`,
      ),
    enabled: Boolean(orgId),
  });
}

export function useCreateDomain(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrganizationDomainCreate) =>
      apiPost<OrganizationDomainRead>(
        `/admin/organizations/${orgId}/domains`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.organizationDomains(orgId),
      });
    },
  });
}

export function usePatchDomain(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      domainId,
      body,
    }: {
      domainId: string;
      body: OrganizationDomainPatch;
    }) =>
      apiPatch<OrganizationDomainRead>(
        `/admin/organization-domains/${domainId}`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.organizationDomains(orgId),
      });
    },
  });
}

export function useDeleteDomain(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (domainId: string) =>
      apiDelete(`/admin/organization-domains/${domainId}`),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.organizationDomains(orgId),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Org units
// ---------------------------------------------------------------------------

export function useOrgUnits(
  orgId: string | undefined,
  options: { parentUnitId?: string | null; onlyRoots?: boolean } = {},
) {
  const { parentUnitId, onlyRoots } = options;
  return useQuery({
    queryKey: queryKeys.admin.organizationUnits(
      orgId ?? "",
      parentUnitId,
      onlyRoots,
    ),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (onlyRoots) qs.set("only_roots", "true");
      if (parentUnitId) qs.set("parent_unit_id", parentUnitId);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return apiFetch<OrgUnitRead[]>(
        `/admin/organizations/${orgId}/units${suffix}`,
      );
    },
    enabled: Boolean(orgId),
  });
}

/**
 * One node of the nested org tree.
 *
 * Declared here rather than pulled from `openapi-types.d.ts` so the tree UI
 * does not depend on the generated types being regenerated first; the shape
 * mirrors the backend `OrgUnitNode` schema.
 */
export interface OrgUnitNode {
  id: string;
  organization_id: string;
  parent_unit_id: string | null;
  unit_type: string;
  name: string;
  code: string | null;
  created_at: string;
  updated_at: string;
  children: OrgUnitNode[];
  /** Units below this one. Drives the delete confirmation's blast radius. */
  descendant_count: number;
}

/**
 * The whole org tree in one request.
 *
 * Deliberately NOT a per-level fetch off `useOrgUnits({parentUnitId})`: the
 * tree renders expand/collapse over an already-known structure, and lazy
 * per-node loading would cost a round-trip per expand and make "how many
 * units am I about to delete" unanswerable without walking the server.
 */
export function useOrgUnitTree(orgId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "organizations", orgId ?? "", "units", "tree"] as const,
    queryFn: () =>
      apiFetch<OrgUnitNode[]>(`/admin/organizations/${orgId}/units/tree`),
    enabled: Boolean(orgId),
  });
}

export function useOrgUnit(unitId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.orgUnitDetail(unitId ?? ""),
    queryFn: () => apiFetch<OrgUnitRead>(`/admin/org-units/${unitId}`),
    enabled: Boolean(unitId),
  });
}

export function useCreateOrgUnit(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrgUnitCreate) =>
      apiPost<OrgUnitRead>(`/admin/organizations/${orgId}/units`, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin", "organizations", orgId, "units"] as const,
      });
    },
  });
}

export function usePatchOrgUnit(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ unitId, body }: { unitId: string; body: OrgUnitPatch }) =>
      apiPatch<OrgUnitRead>(`/admin/org-units/${unitId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin", "organizations", orgId, "units"] as const,
      });
      void qc.invalidateQueries({
        queryKey: ["admin", "org-units"] as const,
      });
    },
  });
}

export function useDeleteOrgUnit(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (unitId: string) => apiDelete(`/admin/org-units/${unitId}`),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin", "organizations", orgId, "units"] as const,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------

export function useOrganizationMemberships(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.organizationMemberships(orgId ?? ""),
    queryFn: () =>
      apiFetch<MembershipRead[]>(`/admin/organizations/${orgId}/memberships`),
    enabled: Boolean(orgId),
  });
}

export function useCreateMembership(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MembershipCreate) =>
      apiPost<MembershipRead>(
        `/admin/organizations/${orgId}/memberships`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.organizationMemberships(orgId),
      });
    },
  });
}

export function usePatchMembership(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      membershipId,
      body,
    }: {
      membershipId: string;
      body: MembershipPatch;
    }) =>
      apiPatch<MembershipRead>(
        `/admin/organization-memberships/${membershipId}`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.organizationMemberships(orgId),
      });
    },
  });
}

export function useDeleteMembership(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) =>
      apiDelete(`/admin/organization-memberships/${membershipId}`),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.organizationMemberships(orgId),
      });
    },
  });
}
