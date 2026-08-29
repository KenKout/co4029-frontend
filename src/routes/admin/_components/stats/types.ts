import type { ActionSeverity } from "@/components/ui/action-tile";
import type { AdminDashboardOut } from "@/lib/api/hooks/admin";
import type { SecuritySummary } from "@/lib/api/hooks/admin-security";
import type { DeepHealthResponse } from "@/lib/api/hooks/infra";

/**
 * Shared types for the Admin Operations overview.
 *
 * The dashboard is a system-operations console: it answers "is anything wrong,
 * and where do I go" for a platform operator. Two rules from the PRD shape
 * every type in this file.
 *
 * 1. **Current status and needs-action are different questions** (ADM-002).
 *    Healthy and zero states belong to status; the action list holds only
 *    things somebody has to do something about. So they are separate types,
 *    not one list with a severity field that happens to be "ok".
 * 2. **A missing number is not zero** (section 5). Every rate that can have an
 *    empty denominator is `number | null`, and `null` renders as "No data".
 */

// Localised copy lookup. Typed as a plain call signature (rather than
// i18next's generic `TFunction`) so helpers and presentational sections can
// accept it without importing the i18n generics.
export type TFn = (key: string, opts?: Record<string, unknown>) => string;

/** Number formatters bound to the active locale. */
export interface StatsFormatters {
  count: (n: number | undefined | null) => string;
  usd: (n: number | undefined | null) => string;
  /** `null` becomes the "No data" string, never "0%". */
  pct: (n: number | undefined | null, digits?: number) => string;
  seconds: (ms: number | undefined | null) => string;
  /** Coarse human duration for an age in seconds ("2h 14m"). */
  duration: (seconds: number | undefined | null) => string;
}

/** One dependency in the Current Status strip. */
export interface ServiceStatus {
  key: string;
  /** Translated dependency name ("Postgres", "Workers"). */
  label: string;
  /**
   * `unknown` is its own state and never collapses into `down`: "we could not
   * reach the probe" and "the database is down" call for different actions.
   */
  state: "ok" | "degraded" | "down" | "disabled" | "unknown";
  /** Probe latency, when the check reported one. */
  latencyMs?: number | null;
}

/** Rolled-up platform state shown beside the dependency strip. */
export interface CurrentStatus {
  /**
   * `partial` means "healthy as far as we actually checked" — every probe that
   * ran came back ok, but at least one dependency was never checked. It is a
   * distinct state from `ok` on purpose: claiming "all systems operational"
   * while the AI provider is unverified is the dashboard asserting something
   * it does not know.
   */
  overall: "ok" | "partial" | "degraded" | "down" | "unknown";
  services: ServiceStatus[];
  /** Dependencies that reported no result — the reason for `partial`. */
  uncheckedServices: string[];
  version?: string;
  isLoading: boolean;
  isError: boolean;
}

/**
 * One row of the Needs Action list.
 *
 * Every field is mandatory except `age` because ADM-001 requires each entry to
 * carry severity, a target and a call to action — a list of bare numbers with
 * nowhere to click just relocates the work. `age` is optional and honestly so:
 * a queue has an oldest-job age, a windowed failure rate does not, and
 * inventing one would be worse than omitting it.
 */
export interface OperatorAlert {
  key: string;
  severity: "warn" | "critical";
  /** What is wrong, in one line. */
  label: string;
  /** The headline number. */
  value: string;
  /** The evidence: numerator, denominator and window. */
  detail: string;
  /** How long it has been true, when the data supports saying. */
  age?: string;
  /** The subsystem this is about ("Processing queue", "AI provider"). */
  target: string;
  /** Where to go to act on it. */
  to: string;
  search?: Record<string, string>;
  ctaLabel: string;
}

/** Reliability & throughput row. Rates are nullable by contract. */
export interface ReliabilitySummary {
  jobFailureRatePct: number | null;
  jobFailureTrendPct: number | null;
  jobsTerminal: number;
  jobsFailed: number;
  jobSeverity: ActionSeverity;
  queueDepth: number;
  queueOldestAgeSeconds: number | null;
  queueSeverity: ActionSeverity;
  apiErrorRatePct: number | null;
  requests: number;
  requests5xx: number;
  apiSeverity: ActionSeverity;
  apiP95LatencyMs: number | null;
}

/** Cost & capacity row. */
export interface CostSummary {
  spend: number;
  prevSpend: number;
  deltaPct: number | null;
  severity: ActionSeverity;
  projectedMonthEnd: number;
  tokens: number;
  aiFailureRatePct: number | null;
  aiCalls: number;
  aiFailed: number;
  aiSeverity: ActionSeverity;
  topDriver: string | null;
  topDriverUsd: number;
  slowestModel: string | null;
  slowestModelP95Ms: number;
  materialsIngested: number;
  activeUsersToday: number;
  activeUsersWindow: number;
  totalUsers: number;
}

/** Tenant anomalies row. */
export interface TenantSummary {
  orgsTotal: number;
  orgsInactive: number;
  severity: ActionSeverity;
}

/** Dashboard window + tenant filter state (ADM-005). */
export interface DashboardScope {
  windowDays: number;
  setWindowDays: (days: number) => void;
  organizationId: string | null;
  setOrganizationId: (id: string | null) => void;
  /** Only a `system.administer` caller may narrow to another tenant. */
  canFilterOrganization: boolean;
  organizations: { id: string; name: string }[];
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
  deepHealth: DeepHealthResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  scope: DashboardScope;
  /** Server evaluation timestamp for every number on the page (ADM-004). */
  asOf: string | undefined;
  currentStatus: CurrentStatus;
  /** Security & access rollup. Loads independently of the metric rollup, so a
   *  failure here costs this row and nothing else (ADM-015). */
  security: {
    data: SecuritySummary | undefined;
    isLoading: boolean;
    isError: boolean;
  };
  alerts: OperatorAlert[];
  reliability: ReliabilitySummary;
  cost: CostSummary;
  tenant: TenantSummary;
}
