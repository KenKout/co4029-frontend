import type { ActionSeverity } from "@/components/ui/action-tile";
import type { AdminDashboardOut } from "@/lib/api/hooks/admin";

import type {
  AttentionCandidate,
  HealthSummary,
  PassRateSummary,
  ReadyzSummary,
  SpendSummary,
  TFn,
} from "./types";

type Dashboard = AdminDashboardOut | undefined;

/**
 * Roll the readiness probe up into one word. Any failing dependency degrades
 * the whole tile — an admin needs "is anything wrong" before the detail.
 */
export function deriveHealth(
  ready: ReadyzSummary | undefined,
  readyzIsError: boolean,
): HealthSummary {
  const healthParts = ready
    ? [
        ready.postgres === "ok",
        ready.redis === "ok",
        ready.alembic_at_head === true,
      ]
    : [];
  const healthOk = healthParts.length > 0 && healthParts.every(Boolean);
  const healthKnown = healthParts.length > 0 && !readyzIsError;
  const healthSeverity: ActionSeverity = !healthKnown
    ? "warn"
    : healthOk
      ? "ok"
      : "critical";
  return { ok: healthOk, known: healthKnown, severity: healthSeverity };
}

export function jobFailureRate(data: Dashboard): number {
  return data?.job_failure_rate_pct ?? 0;
}

/**
 * Thresholds: >10% failure rate is loud, >2% worth noticing. Chosen so a
 * healthy platform shows neutral tiles and today's 33% reads as critical.
 */
export function deriveFailureSeverity(failureRate: number): ActionSeverity {
  return failureRate > 10 ? "critical" : failureRate > 2 ? "warn" : "ok";
}

export function deriveQueueSeverity(data: Dashboard): ActionSeverity {
  return (data?.queue_depth ?? 0) > 50
    ? "warn"
    : (data?.queue_depth ?? 0) > 0
      ? "ok"
      : "ok";
}

export function deriveFailedCallsSeverity(data: Dashboard): ActionSeverity {
  return (data?.failed_ai_calls_30d ?? 0) > 25
    ? "warn"
    : (data?.failed_ai_calls_30d ?? 0) > 0
      ? "ok"
      : "ok";
}

/**
 * Job failure rate trend vs the prior 7d, so the tile shows whether things are
 * improving or degrading rather than just the current level. null when the
 * prior window had no jobs at all — no baseline to compare against.
 */
export function deriveFailureTrendPct(
  data: Dashboard,
  failureRate: number,
): number | null {
  const prevFailureRate =
    (data?.jobs_total_prev_7d ?? 0) > 0
      ? (100 * (data?.jobs_failed_prev_7d ?? 0)) /
        (data?.jobs_total_prev_7d ?? 1)
      : null;
  return prevFailureRate !== null && prevFailureRate > 0
    ? ((failureRate - prevFailureRate) / prevFailureRate) * 100
    : null;
}

/**
 * A multi-fold week-over-week jump is a budget event, not routine growth, so
 * it earns the same visual weight as a failure. >300% loud, >100% worth a look.
 */
export function deriveSpend(data: Dashboard): SpendSummary {
  const spend = data?.spend_7d_usd ?? 0;
  const prevSpend = data?.spend_prev_7d_usd ?? 0;
  const spendDeltaPct =
    prevSpend > 0 ? ((spend - prevSpend) / prevSpend) * 100 : null;
  const spendSeverity: ActionSeverity =
    spendDeltaPct === null
      ? "ok"
      : spendDeltaPct > 300
        ? "critical"
        : spendDeltaPct > 100
          ? "warn"
          : "ok";
  return {
    spend,
    prevSpend,
    deltaPct: spendDeltaPct,
    severity: spendSeverity,
  };
}

/**
 * Interview pass rate. A low rate is only a platform signal once enough
 * DISTINCT students have been evaluated — 29 sessions from 2 students (the dev
 * state) is a testing artifact, and shouting about it trains operators to
 * ignore the tile. Below the threshold we show it captioned instead of red.
 */
export function derivePassRate(data: Dashboard): PassRateSummary {
  const passRate = data?.interview_pass_rate_pct ?? 0;
  const evaluated = data?.interview_evaluated_7d ?? 0;
  const students = data?.interview_students_7d ?? 0;
  const passRateIsMeaningful = evaluated >= 20 && students >= 5;
  const passRateSeverity: ActionSeverity = !passRateIsMeaningful
    ? "ok"
    : passRate < 25
      ? "critical"
      : passRate < 50
        ? "warn"
        : "ok";
  return {
    passRate,
    evaluated,
    students,
    isMeaningful: passRateIsMeaningful,
    severity: passRateSeverity,
  };
}

/**
 * Needs-attention checklist. Built as data so zero-count checks can be
 * filtered out (and counted for the "also clear" footnote) rather than
 * rendered as resolved rows inside a section called "Needs attention".
 */
export function buildAttentionCandidates(
  t: TFn,
  data: Dashboard,
): AttentionCandidate[] {
  return [
    {
      key: "materials_stuck",
      label: t("admin.dashboard.attention.materials_stuck"),
      count: data?.materials_stuck_processing ?? 0,
      to: "/admin/processing",
      search: { status: "running" },
      severity: "critical",
    },
    {
      key: "quizzes_missing_texp",
      label: t("admin.dashboard.attention.quizzes_missing_texp"),
      count: data?.published_quizzes_missing_texp ?? 0,
      to: "/admin/courses",
    },
    {
      key: "configs_unreviewed",
      label: t("admin.dashboard.attention.configs_unreviewed"),
      count: data?.interview_configs_no_reviewed_questions ?? 0,
      to: "/admin/courses",
    },
    {
      key: "orgs_inactive",
      label: t("admin.dashboard.attention.orgs_inactive"),
      count: data?.orgs_inactive_30d ?? 0,
      to: "/admin/organizations",
    },
  ];
}
