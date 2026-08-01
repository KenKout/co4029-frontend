import { Clock, DollarSign, Gauge } from "lucide-react";

import { ActionTile } from "@/components/ui/action-tile";

import { MiniStat } from "./MiniStat";
import { RowHeading } from "./RowHeading";
import type { AdminStatsController } from "./types";

/** Row 2: the cost snapshot. */
export function CostSnapshotRow({ c }: { c: AdminStatsController }) {
  const { t, f, data } = c;
  const {
    spend,
    prevSpend,
    deltaPct: spendDeltaPct,
    severity: spendSeverity,
  } = c.spend;

  return (
    <section className="space-y-3">
      <RowHeading>{t("admin.dashboard.rows.cost")}</RowHeading>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {/* Spend gets the ActionTile treatment rather than a quiet MiniStat: a
            multi-fold week-over-week jump is a budget event and should carry
            the same weight as a failure, not look like routine growth. */}
        <ActionTile
          label={t("admin.dashboard.cost.spend_7d")}
          value={f.usd(spend)}
          detail={t("admin.dashboard.cost.prev_window", {
            usd: f.usd(prevSpend),
          })}
          severity={spendSeverity}
          icon={DollarSign}
          to="/admin/ai-costs"
          trend={{
            deltaPct: spendDeltaPct,
            higherIsWorse: true,
            noBaselineLabel: t("admin.dashboard.cost.no_prior"),
          }}
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
          tone={(data?.slowest_model_p95_ms ?? 0) > 30_000 ? "warn" : "default"}
        />
      </div>
    </section>
  );
}
