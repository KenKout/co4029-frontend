import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * Tenant operations (PRD ADM-042).
 *
 * Note the job fields: these ARE organization-scoped, unlike the platform-wide
 * job metrics on the dashboard. The server can walk one tenant's entity set
 * directly; it cannot do that across every tenant, which is why the dashboard
 * still labels its job numbers global. The two are measuring different
 * populations on purpose.
 */
export interface TenantOperations {
  organization_id: string;
  as_of: string;
  window_days: number;

  active_members: number;
  members_active_in_window: number;

  course_count: number;
  published_course_count: number;
  material_count: number;
  storage_bytes: number;

  jobs_terminal_window: number;
  jobs_failed_window: number;
  jobs_in_flight: number;
  /** `null` when no job reached a terminal state — never 0%. */
  job_failure_rate_pct: number | null;

  spend_window_usd: number;
  /**
   * Share of platform spend attributable to any tenant. Travels with the
   * per-tenant figure because a low value means this tenant's spend
   * understates what it actually cost.
   */
  spend_coverage_pct: number | null;

  config_overrides: number;

  is_inactive: boolean;
  last_activity_at: string | null;
  days_quiet: number | null;
}

export function useTenantOperations(orgId: string, windowDays?: number) {
  const qs = windowDays === undefined ? "" : `?window_days=${windowDays}`;
  return useQuery({
    queryKey: queryKeys.admin.tenantOperations(orgId, windowDays),
    queryFn: () =>
      apiFetch<TenantOperations>(
        `/admin/organizations/${orgId}/operations${qs}`,
      ),
    enabled: Boolean(orgId),
    staleTime: 1000 * 30,
  });
}
