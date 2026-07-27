import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  DollarSign,
  FileText,
  Gauge,
  HeartPulse,
  Layers,
  MessagesSquare,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ActionTile, type ActionSeverity } from "@/components/ui/action-tile";
import { useAdminDashboard } from "@/lib/api/hooks/admin";
import { useReadyz } from "@/lib/api/hooks/infra";
import { cn } from "@/lib/utils";

function useFormatters() {
  const { i18n } = useTranslation();
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
  return {
    count: (n: number | undefined | null): string =>
      n === undefined || n === null
        ? "—"
        : new Intl.NumberFormat(locale).format(n),
    usd: (n: number | undefined | null): string =>
      n === undefined || n === null
        ? "—"
        : new Intl.NumberFormat(locale, {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: n < 10 ? 2 : 0,
          }).format(n),
    pct: (n: number | undefined | null, digits = 0): string =>
      n === undefined || n === null ? "—" : `${n.toFixed(digits)}%`,
    seconds: (ms: number | undefined | null): string =>
      ms === undefined || ms === null
        ? "—"
        : ms >= 1000
          ? `${(ms / 1000).toFixed(1)}s`
          : `${Math.round(ms)}ms`,
  };
}

/** Section heading with an explicit time window, so no number is ambiguous. */
function RowHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
      {children}
    </h2>
  );
}

/** Compact metric used in the cost snapshot and activity rows. */
function MiniStat({
  label,
  value,
  detail,
  icon: Icon,
  to,
  search,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: typeof Users;
  to?: string;
  search?: Record<string, string>;
  tone?: "default" | "warn";
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-m3-on-surface-variant">
          {label}
        </p>
        {Icon && (
          <Icon
            aria-hidden="true"
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              tone === "warn" ? "text-amber-600" : "text-text-subtle",
            )}
          />
        )}
      </div>
      <p
        className={cn(
          "mt-1.5 text-xl font-heading font-semibold tabular-nums",
          tone === "warn" ? "text-amber-700" : "text-m3-on-surface",
        )}
      >
        {value}
      </p>
      {detail && (
        <p className="mt-0.5 text-xs text-text-muted truncate">{detail}</p>
      )}
    </>
  );
  const shell =
    "rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong";
  if (!to) return <div className={shell}>{body}</div>;
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      search={search as never}
      className={cn(shell, "block focus:outline-none focus-visible:ring-2")}
    >
      {body}
    </Link>
  );
}

/**
 * One row of the "needs attention" checklist.
 *
 * Renders as resolved (muted, tick) at zero rather than being hidden, so the
 * operator can see the check ran and came back clean instead of wondering
 * whether it was skipped.
 */
function AttentionRow({
  label,
  count,
  to,
  search,
}: {
  label: string;
  count: number | undefined;
  to: string;
  search?: Record<string, string>;
}) {
  const { t } = useTranslation();
  const n = count ?? 0;
  const clear = n === 0;
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      search={search as never}
      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-muted/60"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {clear ? (
          <CheckCircle2
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-emerald-600"
          />
        ) : (
          <AlertTriangle
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-amber-600"
          />
        )}
        <span
          className={cn(
            "truncate text-sm",
            clear ? "text-text-muted" : "font-medium text-text-strong",
          )}
        >
          {label}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
          clear
            ? "bg-surface-muted text-text-subtle"
            : "bg-amber-100 text-amber-800",
        )}
      >
        {clear ? t("admin.dashboard.attention.clear") : n}
      </span>
    </Link>
  );
}

export default function AdminStatsPage() {
  const { t } = useTranslation();
  const f = useFormatters();
  const { data, isLoading, isError } = useAdminDashboard();
  const readyz = useReadyz();

  // Roll the readiness probe up into one word. Any failing dependency degrades
  // the whole tile — an admin needs "is anything wrong" before the detail.
  const ready = readyz.data as
    | { postgres?: string; redis?: string; alembic_at_head?: boolean }
    | undefined;
  const healthParts = ready
    ? [
        ready.postgres === "ok",
        ready.redis === "ok",
        ready.alembic_at_head === true,
      ]
    : [];
  const healthOk = healthParts.length > 0 && healthParts.every(Boolean);
  const healthKnown = healthParts.length > 0 && !readyz.isError;
  const healthSeverity: ActionSeverity = !healthKnown
    ? "warn"
    : healthOk
      ? "ok"
      : "critical";

  // Thresholds: >10% failure rate is loud, >2% worth noticing. Chosen so a
  // healthy platform shows neutral tiles and today's 33% reads as critical.
  const failureRate = data?.job_failure_rate_pct ?? 0;
  const failureSeverity: ActionSeverity =
    failureRate > 10 ? "critical" : failureRate > 2 ? "warn" : "ok";
  const queueSeverity: ActionSeverity =
    (data?.queue_depth ?? 0) > 50
      ? "warn"
      : (data?.queue_depth ?? 0) > 0
        ? "ok"
        : "ok";
  const failedCallsSeverity: ActionSeverity =
    (data?.failed_ai_calls_30d ?? 0) > 25
      ? "warn"
      : (data?.failed_ai_calls_30d ?? 0) > 0
        ? "ok"
        : "ok";

  const spend = data?.spend_7d_usd ?? 0;
  const prevSpend = data?.spend_prev_7d_usd ?? 0;
  const spendDeltaPct =
    prevSpend > 0 ? ((spend - prevSpend) / prevSpend) * 100 : null;
  const spendUp = spendDeltaPct !== null && spendDeltaPct > 0;

  if (isError) {
    return (
      <div className="space-y-6 pb-12">
        <PageHeading />
        <div className="rounded-lg border border-border bg-surface-elev p-5">
          <p className="text-sm text-danger">{t("admin.stats.load_failed")}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <PageHeading />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-surface-muted"
            />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-xl bg-surface-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeading />

      {/* ---- Row 1: needs action ------------------------------------------ */}
      <section className="space-y-3">
        <RowHeading>{t("admin.dashboard.rows.needs_action")}</RowHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            label={t("admin.dashboard.tiles.job_failure_rate")}
            value={f.pct(failureRate)}
            detail={t("admin.dashboard.tiles.job_failure_detail", {
              failed: f.count(data?.jobs_failed_7d),
              total: f.count(data?.jobs_total_7d),
            })}
            severity={failureSeverity}
            icon={XCircle}
            to="/admin/processing"
            search={{ status: "failed" }}
          />
          <ActionTile
            label={t("admin.dashboard.tiles.queue_depth")}
            value={f.count(data?.queue_depth)}
            detail={t("admin.dashboard.tiles.queue_depth_detail")}
            severity={queueSeverity}
            icon={Layers}
            to="/admin/processing"
          />
          <ActionTile
            label={t("admin.dashboard.tiles.failed_ai_calls")}
            value={f.count(data?.failed_ai_calls_30d)}
            detail={t("admin.dashboard.tiles.window_30d")}
            severity={failedCallsSeverity}
            icon={Activity}
            to="/admin/ai-costs"
            search={{ status: "failed" }}
          />
          <ActionTile
            label={t("admin.dashboard.tiles.system_health")}
            value={
              healthKnown
                ? healthOk
                  ? t("admin.dashboard.health.ok")
                  : t("admin.dashboard.health.degraded")
                : t("admin.dashboard.health.unknown")
            }
            detail={t("admin.dashboard.tiles.system_health_detail")}
            severity={healthSeverity}
            icon={HeartPulse}
            to="/admin/health"
            statusText={
              healthKnown && !healthOk
                ? t("admin.dashboard.health.degraded")
                : undefined
            }
          />
        </div>
      </section>

      {/* ---- Row 2: cost snapshot ----------------------------------------- */}
      <section className="space-y-3">
        <RowHeading>{t("admin.dashboard.rows.cost")}</RowHeading>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <MiniStat
            label={t("admin.dashboard.cost.spend_7d")}
            value={f.usd(spend)}
            detail={
              spendDeltaPct === null
                ? t("admin.dashboard.cost.no_prior")
                : t("admin.dashboard.cost.vs_prev", {
                    delta: `${spendUp ? "+" : ""}${spendDeltaPct.toFixed(0)}%`,
                  })
            }
            icon={spendUp ? TrendingUp : TrendingDown}
            to="/admin/ai-costs"
          />
          <MiniStat
            label={t("admin.dashboard.cost.projected_month")}
            value={f.usd(data?.projected_month_end_usd)}
            detail={t("admin.dashboard.cost.projected_detail")}
            icon={DollarSign}
            to="/admin/ai-costs"
          />
          <MiniStat
            label={t("admin.dashboard.cost.top_driver")}
            value={data?.top_cost_driver ?? "—"}
            detail={t("admin.dashboard.cost.top_driver_detail", {
              usd: f.usd(data?.top_cost_driver_usd),
            })}
            icon={Gauge}
            to="/admin/ai-costs"
          />
          <MiniStat
            label={t("admin.dashboard.cost.slowest_model")}
            value={data?.slowest_model ?? "—"}
            detail={t("admin.dashboard.cost.slowest_detail", {
              p95: f.seconds(data?.slowest_model_p95_ms),
            })}
            icon={Clock}
            to="/admin/ai-costs"
            // A p95 over 30s is a user-visible stall, not just a slow model.
            tone={
              (data?.slowest_model_p95_ms ?? 0) > 30_000 ? "warn" : "default"
            }
          />
        </div>
      </section>

      {/* ---- Row 3: platform activity ------------------------------------- */}
      <section className="space-y-3">
        <RowHeading>{t("admin.dashboard.rows.activity")}</RowHeading>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <MiniStat
            label={t("admin.dashboard.activity.active_users")}
            value={t("admin.dashboard.activity.active_users_value", {
              wau: f.count(data?.active_users_7d),
              total: f.count(data?.total_users),
            })}
            detail={t("admin.dashboard.activity.active_users_detail", {
              today: f.count(data?.active_users_today),
            })}
            icon={Users}
            to="/admin/stats/active"
          />
          <MiniStat
            label={t("admin.dashboard.activity.quiz_sessions")}
            value={f.count(data?.quiz_sessions_completed_7d)}
            detail={t("admin.dashboard.tiles.window_7d")}
            icon={ClipboardCheck}
          />
          <MiniStat
            label={t("admin.dashboard.activity.interview_sessions")}
            value={f.count(data?.interview_sessions_7d)}
            detail={t("admin.dashboard.activity.pass_rate", {
              pct: f.pct(data?.interview_pass_rate_pct, 1),
            })}
            icon={MessagesSquare}
          />
          <MiniStat
            label={t("admin.dashboard.activity.materials_ingested")}
            value={f.count(data?.materials_ingested_7d)}
            detail={t("admin.dashboard.tiles.window_7d")}
            icon={FileText}
            to="/admin/stats/content"
          />
        </div>
      </section>

      {/* ---- Row 4: needs attention --------------------------------------- */}
      <section className="space-y-3">
        <RowHeading>{t("admin.dashboard.rows.attention")}</RowHeading>
        <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
          <AttentionRow
            label={t("admin.dashboard.attention.materials_stuck")}
            count={data?.materials_stuck_processing}
            to="/admin/processing"
            search={{ status: "running" }}
          />
          <AttentionRow
            label={t("admin.dashboard.attention.quizzes_missing_texp")}
            count={data?.published_quizzes_missing_texp}
            to="/admin/courses"
          />
          <AttentionRow
            label={t("admin.dashboard.attention.configs_unreviewed")}
            count={data?.interview_configs_no_reviewed_questions}
            to="/admin/courses"
          />
          <AttentionRow
            label={t("admin.dashboard.attention.orgs_inactive")}
            count={data?.orgs_inactive_30d}
            to="/admin/organizations"
          />
          <AttentionRow
            label={t("admin.dashboard.attention.audit_review")}
            count={0}
            to="/admin/audit-logs"
          />
        </div>
        <p className="text-xs text-text-muted">
          {t("admin.dashboard.attention.footnote")}
        </p>
      </section>
    </div>
  );
}

function PageHeading() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-headline font-bold text-text-strong">
        {t("admin.stats.title_overview")}
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        {t("admin.dashboard.subtitle")}
      </p>
    </div>
  );
}
