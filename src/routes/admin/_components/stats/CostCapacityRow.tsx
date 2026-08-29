import { Coins, Cpu, TrendingUp, Users } from "lucide-react";

import { ActionTile } from "@/components/ui/action-tile";
import { SectionErrorBox } from "@/components/ui/section-error-box";

import { RowHeading } from "./RowHeading";
import { ScopeNote } from "./ScopeNote";
import type { AdminStatsController } from "./types";

/**
 * Row 4: Cost & Capacity.
 *
 * Budget and provider quota (PRD section 3) are not here: there is no budget
 * model in the schema and no quota source to read, and a tile that invents a
 * ceiling is worse than one that admits there is none. Spend is shown against
 * the previous window and the linear month-end projection, which is what the
 * data actually supports today.
 */
export function CostCapacityRow({ c }: { c: AdminStatsController }) {
  const { t, f, cost, scope } = c;
  const window = t("admin.dashboard.window.label", { days: scope.windowDays });

  if (c.isError) {
    return (
      <section className="space-y-3" aria-labelledby="admin-cost">
        <RowHeading id="admin-cost">
          {t("admin.dashboard.rows.cost_capacity")}
        </RowHeading>
        <SectionErrorBox messageKey="admin.stats.load_failed" />
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="admin-cost">
      <RowHeading id="admin-cost">
        {t("admin.dashboard.rows.cost_capacity")}
      </RowHeading>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ActionTile
          label={t("admin.dashboard.tiles.spend")}
          value={f.usd(cost.spend)}
          detail={t("admin.dashboard.tiles.spend_detail", {
            previous: f.usd(cost.prevSpend),
            window,
          })}
          severity={cost.severity}
          icon={Coins}
          to="/admin/ai-costs"
          trend={{
            deltaPct: cost.deltaPct,
            higherIsWorse: true,
            noBaselineLabel: t("admin.dashboard.tiles.no_baseline"),
          }}
        />

        <ActionTile
          label={t("admin.dashboard.tiles.projected_month_end")}
          value={f.usd(cost.projectedMonthEnd)}
          detail={t("admin.dashboard.tiles.projected_detail")}
          icon={TrendingUp}
          to="/admin/ai-costs"
        />

        <ActionTile
          label={t("admin.dashboard.tiles.ai_failure_rate")}
          value={f.pct(cost.aiFailureRatePct)}
          detail={t("admin.dashboard.tiles.ai_failure_detail", {
            failed: f.count(cost.aiFailed),
            total: f.count(cost.aiCalls),
            window,
          })}
          severity={cost.aiSeverity}
          icon={Cpu}
          to="/admin/ai-costs"
          search={{ status: "failed" }}
        />

        <ActionTile
          label={t("admin.dashboard.tiles.active_users")}
          value={f.count(cost.activeUsersWindow)}
          detail={t("admin.dashboard.tiles.active_users_detail", {
            today: f.count(cost.activeUsersToday),
            total: f.count(cost.totalUsers),
          })}
          icon={Users}
          to="/admin/stats/active"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CapacityFact
          label={t("admin.dashboard.facts.tokens")}
          value={f.count(cost.tokens)}
        />
        <CapacityFact
          label={t("admin.dashboard.facts.materials_ingested")}
          value={f.count(cost.materialsIngested)}
        />
        <CapacityFact
          label={t("admin.dashboard.facts.top_driver")}
          value={
            cost.topDriver
              ? `${cost.topDriver} · ${f.usd(cost.topDriverUsd)}`
              : t("admin.dashboard.no_data")
          }
        />
      </div>

      <ScopeNote
        c={c}
        scopeKey="cost_scope"
        noteKey="admin.dashboard.scope.cost"
      />
    </section>
  );
}

/** A supporting number with no threshold behind it — context, not a signal. */
function CapacityFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-m3-on-surface-variant">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-text-strong">
        {value}
      </p>
    </div>
  );
}
