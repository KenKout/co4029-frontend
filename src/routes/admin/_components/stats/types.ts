import type { ActionSeverity } from "@/components/ui/action-tile";
import type { AdminDashboardOut } from "@/lib/api/hooks/admin";

/**
 * Shared types for the admin overview dashboard, extracted from the former
 * 353-line / complexity-88 `AdminStatsPage` so the row sections, the derived
 * severity helpers and the page shell agree on one definition.
 */

// Localised copy lookup. Typed as a plain call signature (rather than
// i18next's generic `TFunction`) so helpers and presentational sections can
// accept it without importing the i18n generics.
export type TFn = (key: string, opts?: Record<string, unknown>) => string;

/** The readiness probe payload, narrowed from the untyped `useReadyz` data. */
export interface ReadyzSummary {
  postgres?: string;
  redis?: string;
  alembic_at_head?: boolean;
}

/** Number formatters bound to the active locale. */
export interface StatsFormatters {
  count: (n: number | undefined | null) => string;
  usd: (n: number | undefined | null) => string;
  pct: (n: number | undefined | null, digits?: number) => string;
  seconds: (ms: number | undefined | null) => string;
}

/** Readiness rolled up into one word plus its tile severity. */
export interface HealthSummary {
  ok: boolean;
  known: boolean;
  severity: ActionSeverity;
}

/** 7d spend vs the prior window. */
export interface SpendSummary {
  spend: number;
  prevSpend: number;
  deltaPct: number | null;
  severity: ActionSeverity;
}

/** Interview pass rate plus the sample size that makes it trustworthy. */
export interface PassRateSummary {
  passRate: number;
  evaluated: number;
  students: number;
  isMeaningful: boolean;
  severity: ActionSeverity;
}

/** One candidate row of the "needs attention" checklist. */
export interface AttentionCandidate {
  key: string;
  label: string;
  count: number;
  to: string;
  search?: Record<string, string>;
  severity?: "warn" | "critical";
}

/**
 * Everything the dashboard rows need, resolved once by
 * `useAdminStatsPage()`. Sections take the whole controller rather than
 * twenty scalars.
 */
export interface AdminStatsController {
  t: TFn;
  f: StatsFormatters;
  data: AdminDashboardOut | undefined;
  isLoading: boolean;
  isError: boolean;
  health: HealthSummary;
  failureRate: number;
  failureSeverity: ActionSeverity;
  failureTrendPct: number | null;
  queueSeverity: ActionSeverity;
  failedCallsSeverity: ActionSeverity;
  spend: SpendSummary;
  passRate: PassRateSummary;
  attentionItems: AttentionCandidate[];
  clearCount: number;
}
