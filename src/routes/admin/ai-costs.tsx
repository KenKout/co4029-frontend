import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Activity,
  CircleDollarSign,
  Clock,
  Cpu,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useAiCostsByPipeline,
  useAiCostsByUser,
  useAiCostsSummary,
  useRecentAiCalls,
  type AiCostsPeriod,
} from "@/lib/api/hooks/admin";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type {
  AiCostsByPipeline as AiCostsByPipelineRow,
  AiCostsByUser as AiCostsByUserRow,
  AiCostsRecentCall,
  AiCostsRoleBreakdown,
  AiCostsStageBreakdown,
} from "@/lib/api/types";

const PERIOD_VALUES: AiCostsPeriod[] = ["24h", "7d", "30d"];

function useFormatters() {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi" ? "vi-VN" : "en-US";
  return useMemo(
    () => ({
      usd: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 4,
      }),
      number: new Intl.NumberFormat(locale),
      datetime: new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
      }),
    }),
    [locale],
  );
}

function ChartTooltipUsd({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: Record<string, unknown> }[];
  label?: string;
}) {
  const fmt = useFormatters();
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value;
  return (
    <div className="bg-surface-elev border border-border rounded-md px-3 py-2 shadow-editorial">
      <p className="text-xs font-semibold text-text-strong">{label}</p>
      <p className="text-xs text-text-muted mt-0.5">{fmt.usd.format(value)}</p>
    </div>
  );
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: AiCostsPeriod;
  onChange: (next: AiCostsPeriod) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={t("admin.ai_costs.period_aria")}
      className="inline-flex flex-wrap gap-2 bg-surface-elev border border-border rounded-lg p-1"
    >
      {PERIOD_VALUES.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p)}
            className={
              active
                ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white cursor-pointer"
                : "px-3 py-1.5 text-xs font-semibold rounded-md text-text-strong hover:bg-surface-muted cursor-pointer transition-colors duration-200"
            }
          >
            {t(`admin.ai_costs.period_options.${p}`)}
          </button>
        );
      })}
    </div>
  );
}

function RoleBarChart({ data }: { data: AiCostsRoleBreakdown[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const reducedMotion = useReducedMotion();
  if (data.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">{t("admin.ai_costs.empty.by_role")}</p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="role" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} stroke="var(--color-border)" />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => fmt.usd.format(value)}
            width={80}
          />
          <Tooltip content={<ChartTooltipUsd />} cursor={{ fill: "var(--color-surface-muted)" }} />
          <Bar dataKey="usd" fill="var(--color-primary)" radius={[6, 6, 0, 0]} isAnimationActive={!reducedMotion} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StageBarChart({ data }: { data: AiCostsStageBreakdown[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const reducedMotion = useReducedMotion();
  if (data.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">{t("admin.ai_costs.empty.by_stage")}</p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="stage_name" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} stroke="var(--color-border)" />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => fmt.usd.format(value)}
            width={80}
          />
          <Tooltip content={<ChartTooltipUsd />} cursor={{ fill: "var(--color-surface-muted)" }} />
          <Bar dataKey="usd" fill="var(--color-primary)" radius={[6, 6, 0, 0]} isAnimationActive={!reducedMotion} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopUsersTable({ rows }: { rows: AiCostsByUserRow[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const columns: DataTableColumn<AiCostsByUserRow>[] = [
    {
      id: "user",
      header: t("admin.ai_costs.cols.user"),
      cell: (r) => <span className="font-medium text-text-strong">{r.display_name}</span>,
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-strong">{fmt.usd.format(r.total_usd ?? 0)}</span>
      ),
    },
    {
      id: "tokens",
      header: t("admin.ai_costs.cols.tokens"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">{fmt.number.format(r.total_tokens ?? 0)}</span>
      ),
    },
    {
      id: "calls",
      header: t("admin.ai_costs.cols.calls"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">{fmt.number.format(r.call_count ?? 0)}</span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.user_id}
      pagination
      pageSize={10}
      pageSizeOptions={[10, 20, 50]}
      emptyState={t("admin.ai_costs.empty.users")}
    />
  );
}

function PipelineTable({ rows }: { rows: AiCostsByPipelineRow[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const columns: DataTableColumn<AiCostsByPipelineRow>[] = [
    {
      id: "pipeline",
      header: t("admin.ai_costs.cols.pipeline"),
      cell: (r) => (
        <span className="font-mono text-xs text-text-strong">
          {r.pipeline_run_id.slice(0, 8)}…
        </span>
      ),
    },
    {
      id: "type",
      header: t("admin.ai_costs.cols.type"),
      cell: (r) => <span className="text-text-muted">{r.generation_type ?? "—"}</span>,
    },
    {
      id: "calls",
      header: t("admin.ai_costs.cols.calls"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">{fmt.number.format(r.call_count ?? 0)}</span>
      ),
    },
    {
      id: "tokens",
      header: t("admin.ai_costs.cols.tokens"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">{fmt.number.format(r.total_tokens ?? 0)}</span>
      ),
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-strong">{fmt.usd.format(r.total_usd ?? 0)}</span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.pipeline_run_id}
      pagination
      pageSize={10}
      pageSizeOptions={[10, 20, 50]}
      emptyState={t("admin.ai_costs.empty.pipelines")}
    />
  );
}

function RecentCallsTable({ rows }: { rows: AiCostsRecentCall[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const columns: DataTableColumn<AiCostsRecentCall>[] = [
    {
      id: "time",
      header: t("admin.ai_costs.cols.time"),
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-text-muted">
          {r.created_at ? fmt.datetime.format(new Date(r.created_at)) : "—"}
        </span>
      ),
    },
    {
      id: "model",
      header: t("admin.ai_costs.cols.model"),
      cell: (r) => <span className="font-mono text-xs text-text-strong">{r.model ?? "—"}</span>,
    },
    {
      id: "role",
      header: t("admin.ai_costs.cols.role"),
      cell: (r) => <span className="text-text-muted">{r.role ?? "—"}</span>,
    },
    {
      id: "stage",
      header: t("admin.ai_costs.cols.stage"),
      cell: (r) => <span className="text-text-muted">{r.stage_name ?? "—"}</span>,
    },
    {
      id: "latency",
      header: t("admin.ai_costs.cols.latency"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {r.latency_ms !== null && r.latency_ms !== undefined
            ? `${fmt.number.format(r.latency_ms)} ms`
            : "—"}
        </span>
      ),
    },
    {
      id: "tokens",
      header: t("admin.ai_costs.cols.tokens_short"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">{fmt.number.format(r.tokens ?? 0)}</span>
      ),
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost_short"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-strong">{fmt.usd.format(r.usd ?? 0)}</span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      pagination
      pageSize={15}
      pageSizeOptions={[15, 30, 50]}
      emptyState={t("admin.ai_costs.empty.recent")}
    />
  );
}

export default function AdminAiCostsPage() {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const navigate = useNavigate();
  const permissions = useMyPermissions();
  const canAdmin =
    permissions.data?.permissions.includes("system.administer") ?? false;

  const [period, setPeriod] = useState<AiCostsPeriod>("30d");

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canAdmin) {
      toast.error(t("admin.users.roles.errors.no_permission"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canAdmin, navigate, t]);

  const summary = useAiCostsSummary(period);
  const byUser = useAiCostsByUser({ period, topN: 20 });
  const byPipeline = useAiCostsByPipeline({ period });
  const recent = useRecentAiCalls({ limit: 50 });

  if (permissions.isLoading || !canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const totals = summary.data?.totals;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-text-strong">
            {t("admin.ai_costs.title")}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t("admin.ai_costs.subtitle")}
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {summary.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">{t("admin.ai_costs.summary_load_failed")}</p>
        </div>
      ) : summary.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label={t("admin.ai_costs.stats.total_cost")}
            value={totals?.usd !== undefined && totals?.usd !== null ? fmt.usd.format(totals.usd) : "—"}
            icon={CircleDollarSign}
          />
          <StatCard
            label={t("admin.ai_costs.stats.total_tokens")}
            value={totals?.tokens !== undefined && totals?.tokens !== null ? fmt.number.format(totals.tokens) : "—"}
            icon={Cpu}
          />
          <StatCard
            label={t("admin.ai_costs.stats.call_count")}
            value={totals?.call_count !== undefined && totals?.call_count !== null ? fmt.number.format(totals.call_count) : "—"}
            icon={Activity}
          />
          <StatCard
            label={t("admin.ai_costs.stats.period")}
            value={t(`admin.ai_costs.period_short.${period}`)}
            icon={Clock}
          />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.by_role")}
        </h2>
        {summary.isLoading ? (
          <div className="h-[300px] bg-surface-muted animate-pulse rounded-lg" />
        ) : (
          <RoleBarChart data={summary.data?.by_role ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.by_stage")}
        </h2>
        {summary.isLoading ? (
          <div className="h-[300px] bg-surface-muted animate-pulse rounded-lg" />
        ) : (
          <StageBarChart data={summary.data?.by_stage ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.top_users")}
        </h2>
        {byUser.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">{t("admin.ai_costs.users_load_failed")}</p>
          </div>
        ) : byUser.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-surface-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <TopUsersTable rows={byUser.data ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.top_pipelines")}
        </h2>
        {byPipeline.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">{t("admin.ai_costs.pipelines_load_failed")}</p>
          </div>
        ) : byPipeline.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-surface-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <PipelineTable rows={byPipeline.data ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.recent_calls")}
        </h2>
        {recent.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">{t("admin.ai_costs.recent_load_failed")}</p>
          </div>
        ) : recent.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-surface-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <RecentCallsTable rows={recent.data ?? []} />
        )}
      </section>
    </div>
  );
}
