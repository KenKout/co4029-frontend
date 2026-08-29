import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

import type { AiCostsPeriod } from "./admin";

/**
 * Per-organization AI spend (PRD ADM-040).
 *
 * `ai_model_calls` carries no tenant column, so the server derives ownership
 * by walking each call's optional parent (a generation run or a processing
 * job) to a course and from there to an organization. Calls with neither
 * parent cannot be placed and come back in a row with a null id.
 */
export interface OrganizationSpendRow {
  /** `null` is the unattributed bucket, not a missing value. */
  organization_id: string | null;
  organization_name: string;
  call_count: number;
  failed_count: number;
  tokens: number;
  spend_usd: number;
}

export interface OrganizationSpendPage {
  items: OrganizationSpendRow[];
  total_spend_usd: number;
  attributed_spend_usd: number;
  /** Share of window spend that could be attributed. `null` = no spend. */
  coverage_pct: number | null;
}

const PERIOD_MS: Record<AiCostsPeriod, number> = {
  "24h": 1000 * 60 * 60 * 24,
  "7d": 1000 * 60 * 60 * 24 * 7,
  "30d": 1000 * 60 * 60 * 24 * 30,
};

export function useAiCostsByOrganization(period: AiCostsPeriod, limit = 50) {
  const since = new Date(Date.now() - PERIOD_MS[period]).toISOString();
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.byOrganization(period),
    queryFn: () =>
      apiFetch<OrganizationSpendPage>(
        `/admin/ai/costs/by-organization?since=${encodeURIComponent(since)}&limit=${limit}`,
      ),
    staleTime: 1000 * 60,
  });
}
