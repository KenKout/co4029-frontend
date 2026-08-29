import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * Security & access rollup (PRD ADM-020).
 *
 * Counts, not scores. There is no severity or review state here because alert
 * rules are still an open product decision (D-03); the UI bands these numbers
 * itself and says so, rather than reading an authority the API does not claim.
 */
export interface SecuritySummary {
  as_of: string;
  window_days: number;
  /** 401/403 on the auth surface. */
  failed_logins: number;
  /**
   * Distinct sources behind those failures. `null` when there were none —
   * one IP failing forty times and forty IPs failing once are different
   * stories, and "no failures" is neither.
   */
  distinct_failed_ips: number | null;
  /** 403 elsewhere: a signed-in caller reaching for something not theirs. */
  denied_requests: number;
  role_changes: number;
  role_revocations: number;
  /** Point-in-time count of active admin / manager / hod accounts. */
  privileged_accounts: number;
  active_sessions: number;
  /** Request counts cannot be tenant-filtered; identity counts can. */
  request_scope: "global" | "organization";
  identity_scope: "global" | "organization";
}

export function useSecuritySummary(
  windowDays?: number,
  organizationId?: string | null,
) {
  const params = new URLSearchParams();
  if (windowDays !== undefined) params.set("window_days", String(windowDays));
  if (organizationId) params.set("organization_id", organizationId);
  const qs = params.toString();
  return useQuery({
    queryKey: queryKeys.admin.securitySummary(windowDays, organizationId),
    queryFn: () =>
      apiFetch<SecuritySummary>(`/admin/security/summary${qs ? `?${qs}` : ""}`),
    staleTime: 1000 * 30,
  });
}
