import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AiCostsByCategory,
  AiCostsByModel,
  AiCostsByPipeline,
  AiCostsByUser,
  AiCostsRecentCall,
  AiCostsSummary,
} from "@/lib/api/types";

/**
 * AI-costs dashboard data hooks + window types.
 *
 * Lives apart from `hooks/admin.ts` (which sits under the repo's 800-line
 * lint cap and holds the rest of the admin surface). The window type is an
 * inclusive local CALENDAR range — the same shape as the admin dashboard's
 * ``RangeSelection`` — replacing the old 24h/7d/30d preset selector so the
 * AI-costs page is windowed exactly like the rest of the admin section.
 */

export type AiCostsPeriod = "24h" | "7d" | "30d";

export type AiCostsDimension =
  | "operation"
  | "role"
  | "tier"
  | "stage_name"
  | "model_name"
  | "status";

/** Optional cross-dashboard filters (all narrow the same audit rows). */
export interface AiCostsFilters {
  model?: string | null;
  role?: string | null;
  operation?: string | null;
  status?: string | null;
}

export interface AiCostsRange {
  /** Local ``YYYY-MM-DD`` — inclusive lower bound (that day's 00:00 local). */
  from: string;
  /** Local ``YYYY-MM-DD`` — inclusive upper bound (the day labelled `to`). */
  to: string;
}

/**
 * ``[from 00:00 local, to+1d 00:00 local)`` as UTC ISO — the same
 * local-midnight conversion the audit page uses, so the days the calendar
 * labels are exactly the days the API counts, whatever the timezone.
 */
export function aiCostsRangeBounds(range: AiCostsRange): {
  since: string;
  until: string;
} {
  const since = new Date(`${range.from}T00:00:00`).toISOString();
  const end = new Date(`${range.to}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { since, until: end.toISOString() };
}

/** Append only the set filter params; returns a stable key fragment too. */
function applyAiCostsFilters(
  params: URLSearchParams,
  filters?: AiCostsFilters,
): void {
  if (!filters) return;
  if (filters.model) params.set("model", filters.model);
  if (filters.role) params.set("role", filters.role);
  if (filters.operation) params.set("operation", filters.operation);
  if (filters.status) params.set("status", filters.status);
}

function aiCostsFilterKey(filters?: AiCostsFilters): string {
  if (!filters) return "";
  return [
    filters.model ?? "",
    filters.role ?? "",
    filters.operation ?? "",
    filters.status ?? "",
  ].join("|");
}

export function useAiCostsSummary(
  range: AiCostsRange,
  filters?: AiCostsFilters,
) {
  const { since, until } = aiCostsRangeBounds(range);
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.summary(
      `${range.from}..${range.to}`,
      aiCostsFilterKey(filters),
    ),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("since", since);
      params.set("until", until);
      applyAiCostsFilters(params, filters);
      return apiFetch<AiCostsSummary>(
        `/admin/ai/costs/summary?${params.toString()}`,
      );
    },
    staleTime: 1000 * 60,
  });
}

export function useAiCostsByCategory(opts?: {
  dimension?: AiCostsDimension;
  topN?: number;
  range?: AiCostsRange;
  filters?: AiCostsFilters;
}) {
  const dimension = opts?.dimension ?? "operation";
  const topN = opts?.topN ?? 20;
  const range = opts?.range ?? { from: "", to: "" };
  const filters = opts?.filters;
  const { since, until } = aiCostsRangeBounds(range);
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.byCategory(
      dimension,
      `${range.from}..${range.to}`,
      aiCostsFilterKey(filters),
    ),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("dimension", dimension);
      params.set("since", since);
      params.set("until", until);
      params.set("top_n", String(topN));
      applyAiCostsFilters(params, filters);
      return apiFetch<AiCostsByCategory[]>(
        `/admin/ai/costs/by-category?${params.toString()}`,
      );
    },
    staleTime: 1000 * 60,
  });
}

export function useAiCostsByModel(opts?: {
  topN?: number;
  range?: AiCostsRange;
  filters?: AiCostsFilters;
}) {
  const topN = opts?.topN ?? 20;
  const range = opts?.range ?? { from: "", to: "" };
  const filters = opts?.filters;
  const { since, until } = aiCostsRangeBounds(range);
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.byModel(
      `${range.from}..${range.to}`,
      aiCostsFilterKey(filters),
    ),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("since", since);
      params.set("until", until);
      params.set("top_n", String(topN));
      applyAiCostsFilters(params, filters);
      return apiFetch<AiCostsByModel[]>(
        `/admin/ai/costs/by-model?${params.toString()}`,
      );
    },
    staleTime: 1000 * 60,
  });
}

export function useAiCostsByUser(opts?: {
  topN?: number;
  range?: AiCostsRange;
}) {
  const topN = opts?.topN ?? 20;
  const range = opts?.range ?? { from: "", to: "" };
  const { since, until } = aiCostsRangeBounds(range);
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.byUser(topN, `${range.from}..${range.to}`),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("since", since);
      params.set("until", until);
      params.set("top_n", String(topN));
      return apiFetch<AiCostsByUser[]>(
        `/admin/ai/costs/by-user?${params.toString()}`,
      );
    },
    staleTime: 1000 * 60,
  });
}

export function useAiCostsByPipeline(opts?: {
  topN?: number;
  range?: AiCostsRange;
}) {
  const topN = opts?.topN ?? 20;
  const range = opts?.range ?? { from: "", to: "" };
  const { since, until } = aiCostsRangeBounds(range);
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.byPipeline(`${range.from}..${range.to}`),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("since", since);
      params.set("until", until);
      params.set("top_n", String(topN));
      return apiFetch<AiCostsByPipeline[]>(
        `/admin/ai/costs/by-pipeline?${params.toString()}`,
      );
    },
    staleTime: 1000 * 60,
  });
}

/**
 * Recent AI calls.
 *
 * The backend currently exposes a flat `?limit=` endpoint with no cursor; we
 * therefore wrap a single `useQuery` and surface an `InfiniteList`-compatible
 * interface so callers can swap to true cursor pagination once the API grows.
 */
export function useRecentAiCalls(opts?: { limit?: number }) {
  const limit = opts?.limit ?? 50;
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.recent(limit),
    queryFn: () =>
      apiFetch<AiCostsRecentCall[]>(`/admin/ai/costs/recent?limit=${limit}`),
    staleTime: 1000 * 30,
  });
}

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

export function useAiCostsByOrganization(range: AiCostsRange, limit = 50) {
  const { since, until } = aiCostsRangeBounds(range);
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.byOrganization(
      `${range.from}..${range.to}`,
    ),
    queryFn: () =>
      apiFetch<OrganizationSpendPage>(
        `/admin/ai/costs/by-organization?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&limit=${limit}`,
      ),
    staleTime: 1000 * 60,
  });
}
