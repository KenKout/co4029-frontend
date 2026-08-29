import type { ActionSeverity } from "@/components/ui/action-tile";
import type { AdminDashboardOut } from "@/lib/api/hooks/admin";
import type { DeepHealthResponse } from "@/lib/api/hooks/infra";

import type {
  CostSummary,
  CurrentStatus,
  OperatorAlert,
  ReliabilitySummary,
  ServiceStatus,
  StatsFormatters,
  TenantSummary,
  TFn,
} from "./types";

type Dashboard = AdminDashboardOut | undefined;

/**
 * The shape of "the rollup has not arrived".
 *
 * Defined once and spread over the payload so the row builders below read
 * plain fields instead of forty `?? 0` branches. Note which defaults are
 * `null`: every rate, the queue age and the latency percentiles. Defaulting
 * those to `0` would manufacture the exact claim the metric contract forbids —
 * "nothing failed" out of a window we have not loaded yet.
 */
const EMPTY_DASHBOARD: AdminDashboardOut = {
  as_of: "",
  window_days: 0,
  organization_id: null,
  usage_scope: "global",
  tenant_scope: "global",
  job_scope: "global",
  cost_scope: "global",
  api_scope: "global",
  job_failure_rate_pct: null,
  job_failure_rate_prev_pct: null,
  jobs_terminal_window: 0,
  jobs_failed_window: 0,
  jobs_terminal_prev_window: 0,
  jobs_failed_prev_window: 0,
  queue_depth: 0,
  queue_pending: 0,
  queue_running: 0,
  queue_oldest_age_seconds: null,
  requests_window: 0,
  requests_5xx_window: 0,
  requests_4xx_window: 0,
  api_error_rate_pct: null,
  api_client_error_rate_pct: null,
  api_p50_latency_ms: null,
  api_p95_latency_ms: null,
  spend_window_usd: 0,
  spend_prev_window_usd: 0,
  projected_month_end_usd: 0,
  tokens_window: 0,
  ai_calls_window: 0,
  failed_ai_calls_window: 0,
  ai_failure_rate_pct: null,
  top_cost_driver: null,
  top_cost_driver_usd: 0,
  slowest_model: null,
  slowest_model_p95_ms: 0,
  active_users_today: 0,
  active_users_window: 0,
  total_users: 0,
  materials_ingested_window: 0,
  orgs_total: 0,
  orgs_inactive_30d: 0,
};

function resolved(data: Dashboard): AdminDashboardOut {
  return data ? { ...EMPTY_DASHBOARD, ...data } : EMPTY_DASHBOARD;
}

/**
 * Severity thresholds.
 *
 * `null` — no data — is never a warning. An empty window means nobody ran
 * anything, which is not the same as something being wrong, and colouring it
 * amber produces a permanent false alarm on a quiet deployment.
 */
export function rateSeverity(
  rate: number | null,
  { warn, critical }: { warn: number; critical: number },
): ActionSeverity {
  if (rate === null) return "ok";
  return rate > critical ? "critical" : rate > warn ? "warn" : "ok";
}

/** >10% of terminal jobs failing is loud; >2% is worth a look. */
export const JOB_FAILURE_BANDS = { warn: 2, critical: 10 };
/** Server errors: 5xx is never routine, so the bands sit low. */
export const API_ERROR_BANDS = { warn: 1, critical: 5 };
/** AI calls fail more readily than HTTP requests; bands are wider. */
export const AI_FAILURE_BANDS = { warn: 5, critical: 20 };

/** Queue depth alone says little; the oldest job's age is the real signal. */
export const QUEUE_AGE_WARN_SECONDS = 60 * 30; // 30m in flight
export const QUEUE_AGE_CRITICAL_SECONDS = 60 * 60 * 2; // 2h — pipeline stuck

export function queueSeverity(
  depth: number,
  oldestAgeSeconds: number | null,
): ActionSeverity {
  if (depth === 0 || oldestAgeSeconds === null) return "ok";
  if (oldestAgeSeconds >= QUEUE_AGE_CRITICAL_SECONDS) return "critical";
  if (oldestAgeSeconds >= QUEUE_AGE_WARN_SECONDS) return "warn";
  return "ok";
}

/**
 * A multi-fold week-over-week jump is a budget event, not routine growth, so
 * it earns the same visual weight as a failure. >300% loud, >100% worth a look.
 */
export function spendSeverity(deltaPct: number | null): ActionSeverity {
  if (deltaPct === null) return "ok";
  return deltaPct > 300 ? "critical" : deltaPct > 100 ? "warn" : "ok";
}

export function deltaPct(now: number, prev: number): number | null {
  return prev > 0 ? ((now - prev) / prev) * 100 : null;
}

/** Relative movement between two rates. `null` when there is no baseline. */
export function rateTrendPct(
  now: number | null,
  prev: number | null,
): number | null {
  if (now === null || prev === null || prev === 0) return null;
  return ((now - prev) / prev) * 100;
}

/** Every organization with no activity is worth a look, none is fine. */
export function inactiveOrgSeverity(count: number): ActionSeverity {
  return count > 0 ? "warn" : "ok";
}

// ---------------------------------------------------------------------------
// Current status (ADM-002) — the "is it up" question, kept away from the
// "what must I do" question.
// ---------------------------------------------------------------------------

/**
 * Map one `/healthz/deep` check onto a display state.
 *
 * `disabled` is preserved rather than folded into ok: a feature intentionally
 * switched off should read as off, not as healthy, or the strip quietly claims
 * coverage the deployment does not have.
 */
function serviceState(status: string | undefined): ServiceStatus["state"] {
  switch (status) {
    case "ok":
      return "ok";
    case "unhealthy":
      return "down";
    case "disabled":
      return "disabled";
    case "skipped":
    case undefined:
      return "unknown";
    default:
      return "unknown";
  }
}

/** Dependencies the operator expects to see named, in reading order. */
const SERVICE_ORDER = [
  "postgres",
  "redis",
  "neo4j",
  "garage_s3",
  "llm_provider",
] as const;

export function buildCurrentStatus(
  t: TFn,
  deep: DeepHealthResponse | undefined,
  { isLoading, isError }: { isLoading: boolean; isError: boolean },
): CurrentStatus {
  if (!deep) {
    return {
      overall: "unknown",
      services: [],
      isLoading,
      isError,
    };
  }
  const checks = deep.checks ?? {};
  // Named dependencies first so the strip has a stable shape, then anything
  // the backend added since — an unknown check is still worth showing.
  const keys = [
    ...SERVICE_ORDER.filter((k) => k in checks),
    ...Object.keys(checks).filter(
      (k) => !SERVICE_ORDER.includes(k as (typeof SERVICE_ORDER)[number]),
    ),
  ];
  const services: ServiceStatus[] = keys.map((key) => ({
    key,
    label: t(`admin.dashboard.services.${key}`, { defaultValue: key }),
    state: serviceState(checks[key]?.status),
    latencyMs: checks[key]?.latency_ms ?? null,
  }));
  const overall =
    deep.status === "ok"
      ? "ok"
      : deep.status === "degraded"
        ? "degraded"
        : "down";
  return {
    overall,
    services,
    version: deep.version,
    isLoading,
    isError,
  };
}

// ---------------------------------------------------------------------------
// Reliability / cost / tenant summaries
// ---------------------------------------------------------------------------

export function buildReliability(data: Dashboard): ReliabilitySummary {
  const d = resolved(data);
  return {
    jobFailureRatePct: d.job_failure_rate_pct,
    jobFailureTrendPct: rateTrendPct(
      d.job_failure_rate_pct,
      d.job_failure_rate_prev_pct,
    ),
    jobsTerminal: d.jobs_terminal_window,
    jobsFailed: d.jobs_failed_window,
    jobSeverity: rateSeverity(d.job_failure_rate_pct, JOB_FAILURE_BANDS),
    queueDepth: d.queue_depth,
    queueOldestAgeSeconds: d.queue_oldest_age_seconds,
    queueSeverity: queueSeverity(d.queue_depth, d.queue_oldest_age_seconds),
    apiErrorRatePct: d.api_error_rate_pct,
    requests: d.requests_window,
    requests5xx: d.requests_5xx_window,
    apiSeverity: rateSeverity(d.api_error_rate_pct, API_ERROR_BANDS),
    apiP95LatencyMs: d.api_p95_latency_ms,
  };
}

export function buildCost(data: Dashboard): CostSummary {
  const d = resolved(data);
  const delta = deltaPct(d.spend_window_usd, d.spend_prev_window_usd);
  return {
    spend: d.spend_window_usd,
    prevSpend: d.spend_prev_window_usd,
    deltaPct: delta,
    severity: spendSeverity(delta),
    projectedMonthEnd: d.projected_month_end_usd,
    tokens: d.tokens_window,
    aiFailureRatePct: d.ai_failure_rate_pct,
    aiCalls: d.ai_calls_window,
    aiFailed: d.failed_ai_calls_window,
    aiSeverity: rateSeverity(d.ai_failure_rate_pct, AI_FAILURE_BANDS),
    topDriver: d.top_cost_driver,
    topDriverUsd: d.top_cost_driver_usd,
    slowestModel: d.slowest_model,
    slowestModelP95Ms: d.slowest_model_p95_ms,
    materialsIngested: d.materials_ingested_window,
    activeUsersToday: d.active_users_today,
    activeUsersWindow: d.active_users_window,
    totalUsers: d.total_users,
  };
}

export function buildTenant(data: Dashboard): TenantSummary {
  const d = resolved(data);
  return {
    orgsTotal: d.orgs_total,
    orgsInactive: d.orgs_inactive_30d,
    severity: inactiveOrgSeverity(d.orgs_inactive_30d),
  };
}

// ---------------------------------------------------------------------------
// Needs Action (ADM-001)
// ---------------------------------------------------------------------------

/** Only `warn` and `critical` reach the action list; `ok` is not an action. */
function isActionable(
  severity: ActionSeverity,
): severity is "warn" | "critical" {
  return severity === "warn" || severity === "critical";
}

/**
 * Build the Needs Action list.
 *
 * Everything here is a *problem*: the healthy and zero states live in Current
 * Status, and a rate with no data is neither. That filtering is the whole
 * point of ADM-002 — a list that also reports the things that are fine is a
 * list an operator stops scanning.
 *
 * Each entry carries the evidence (numerator, denominator, window) beside the
 * headline so nobody has to trust a bare percentage, and a destination that is
 * already filtered to the rows behind it.
 */
export function buildAlerts(
  t: TFn,
  f: StatsFormatters,
  reliability: ReliabilitySummary,
  cost: CostSummary,
  tenant: TenantSummary,
  currentStatus: CurrentStatus,
  windowDays: number,
): OperatorAlert[] {
  const alerts: OperatorAlert[] = [];
  const window = t("admin.dashboard.window.label", { days: windowDays });

  // A dependency being down outranks every rate: nothing else on the page is
  // trustworthy while the platform cannot reach its own database.
  const brokenServices = currentStatus.services.filter(
    (s) => s.state === "down",
  );
  if (brokenServices.length > 0) {
    alerts.push({
      key: "dependency_down",
      severity: "critical",
      label: t("admin.dashboard.alerts.dependency_down"),
      value: brokenServices.map((s) => s.label).join(", "),
      detail: t("admin.dashboard.alerts.dependency_down_detail", {
        count: brokenServices.length,
      }),
      target: t("admin.dashboard.targets.platform"),
      to: "/admin/operations",
      search: { tab: "services" },
      ctaLabel: t("admin.dashboard.cta.open_health"),
    });
  }

  if (isActionable(reliability.jobSeverity)) {
    alerts.push({
      key: "job_failure_rate",
      severity: reliability.jobSeverity,
      label: t("admin.dashboard.alerts.job_failure_rate"),
      value: f.pct(reliability.jobFailureRatePct),
      detail: t("admin.dashboard.alerts.job_failure_detail", {
        failed: f.count(reliability.jobsFailed),
        total: f.count(reliability.jobsTerminal),
        window,
      }),
      target: t("admin.dashboard.targets.processing"),
      to: "/admin/operations",
      search: { tab: "failures" },
      ctaLabel: t("admin.dashboard.cta.open_failed_jobs"),
    });
  }

  if (isActionable(reliability.queueSeverity)) {
    alerts.push({
      key: "queue_stalled",
      severity: reliability.queueSeverity,
      label: t("admin.dashboard.alerts.queue_stalled"),
      value: f.count(reliability.queueDepth),
      detail: t("admin.dashboard.alerts.queue_stalled_detail"),
      age: f.duration(reliability.queueOldestAgeSeconds),
      target: t("admin.dashboard.targets.queue"),
      to: "/admin/operations",
      search: { tab: "jobs", status: "running" },
      ctaLabel: t("admin.dashboard.cta.open_queue"),
    });
  }

  if (isActionable(reliability.apiSeverity)) {
    alerts.push({
      key: "api_errors",
      severity: reliability.apiSeverity,
      label: t("admin.dashboard.alerts.api_errors"),
      value: f.pct(reliability.apiErrorRatePct),
      detail: t("admin.dashboard.alerts.api_errors_detail", {
        failed: f.count(reliability.requests5xx),
        total: f.count(reliability.requests),
        window,
      }),
      target: t("admin.dashboard.targets.api"),
      to: "/admin/audit-logs",
      search: { tab: "http" },
      ctaLabel: t("admin.dashboard.cta.open_audit"),
    });
  }

  if (isActionable(cost.aiSeverity)) {
    alerts.push({
      key: "ai_failures",
      severity: cost.aiSeverity,
      label: t("admin.dashboard.alerts.ai_failures"),
      value: f.pct(cost.aiFailureRatePct),
      detail: t("admin.dashboard.alerts.ai_failures_detail", {
        failed: f.count(cost.aiFailed),
        total: f.count(cost.aiCalls),
        window,
      }),
      target: t("admin.dashboard.targets.ai"),
      to: "/admin/ai-costs",
      search: { status: "failed" },
      ctaLabel: t("admin.dashboard.cta.open_ai_costs"),
    });
  }

  if (isActionable(cost.severity)) {
    alerts.push({
      key: "spend_spike",
      severity: cost.severity,
      label: t("admin.dashboard.alerts.spend_spike"),
      value: f.usd(cost.spend),
      detail: t("admin.dashboard.alerts.spend_spike_detail", {
        previous: f.usd(cost.prevSpend),
        window,
      }),
      target: t("admin.dashboard.targets.cost"),
      to: "/admin/ai-costs",
      ctaLabel: t("admin.dashboard.cta.open_ai_costs"),
    });
  }

  if (isActionable(tenant.severity)) {
    alerts.push({
      key: "orgs_inactive",
      severity: tenant.severity,
      label: t("admin.dashboard.alerts.orgs_inactive"),
      value: f.count(tenant.orgsInactive),
      detail: t("admin.dashboard.alerts.orgs_inactive_detail", {
        total: f.count(tenant.orgsTotal),
      }),
      target: t("admin.dashboard.targets.tenants"),
      to: "/admin/organizations",
      ctaLabel: t("admin.dashboard.cta.open_organizations"),
    });
  }

  // Critical before warning, so the worst thing is always the first thing read.
  return alerts.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1,
  );
}
