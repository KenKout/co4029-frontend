import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../client";
import { queryKeys } from "../query-keys";
import type { ManagementDashboardRead } from "../types/management";

/**
 * The manager / faculty-dean decision queue.
 *
 * ONE query for the whole page rather than one per section: `counts` is derived
 * server-side from the same rows the lists render, so splitting it would let a
 * tile disagree with the table beneath it.
 *
 * Scope comes from the caller's ROLE ASSIGNMENTS server-side (faculty for a
 * dean, organization for a manager) — deliberately not from authored courses,
 * which is what the teacher dashboard uses and would return an empty page for
 * a manager who authors nothing.
 */
export function useManagementDashboard(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.management.dashboard(),
    queryFn: () =>
      apiFetch<ManagementDashboardRead>("/management/dashboard"),
    staleTime: 1000 * 60,
    enabled: options?.enabled ?? true,
  });
}
