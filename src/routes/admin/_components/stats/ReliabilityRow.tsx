import { Activity, Layers, Timer, XCircle } from "lucide-react";

import { ActionTile } from "@/components/ui/action-tile";
import { SectionErrorBox } from "@/components/ui/section-error-box";

import { RowHeading } from "./RowHeading";
import { ScopeNote } from "./ScopeNote";
import type { AdminStatsController } from "./types";

/**
 * Row 3: Reliability & Throughput.
 *
 * Levels, not alarms — the alarms already fired in Needs Action. This row
 * exists so an operator can see whether the platform is trending the right way
 * before anything crosses a threshold, and every tile shows the denominator
 * behind its rate so a percentage over three jobs never reads like a
 * percentage over three thousand.
 */
export function ReliabilityRow({ c }: { c: AdminStatsController }) {
  const { t, f, reliability: r, scope } = c;
  const window = t("admin.dashboard.window.label", { days: scope.windowDays });

  if (c.isError) {
    return (
      <section className="space-y-3" aria-labelledby="admin-reliability">
        <RowHeading id="admin-reliability">
          {t("admin.dashboard.rows.reliability")}
        </RowHeading>
        <SectionErrorBox messageKey="admin.stats.load_failed" />
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="admin-reliability">
      <RowHeading id="admin-reliability">
        {t("admin.dashboard.rows.reliability")}
      </RowHeading>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ActionTile
          label={t("admin.dashboard.tiles.job_failure_rate")}
          value={f.pct(r.jobFailureRatePct)}
          detail={t("admin.dashboard.tiles.job_failure_detail", {
            failed: f.count(r.jobsFailed),
            total: f.count(r.jobsTerminal),
            window,
          })}
          severity={r.jobSeverity}
          icon={XCircle}
          to="/admin/operations"
          search={{ tab: "failures" }}
          trend={{
            deltaPct: r.jobFailureTrendPct,
            higherIsWorse: true,
            noBaselineLabel: t("admin.dashboard.tiles.no_baseline"),
          }}
        />

        <ActionTile
          label={t("admin.dashboard.tiles.queue_depth")}
          value={f.count(r.queueDepth)}
          /* Depth without age is not a signal: a deep queue that is draining is
             healthy, a shallow one stuck for two hours is not. */
          detail={t("admin.dashboard.tiles.queue_depth_detail", {
            age: f.duration(r.queueOldestAgeSeconds),
          })}
          severity={r.queueSeverity}
          icon={Layers}
          to="/admin/operations"
          search={{ tab: "jobs" }}
        />

        <ActionTile
          label={t("admin.dashboard.tiles.api_error_rate")}
          value={f.pct(r.apiErrorRatePct, 2)}
          detail={t("admin.dashboard.tiles.api_error_detail", {
            failed: f.count(r.requests5xx),
            total: f.count(r.requests),
            window,
          })}
          severity={r.apiSeverity}
          icon={Activity}
          to="/admin/audit-logs"
          search={{ tab: "http" }}
        />

        <ActionTile
          label={t("admin.dashboard.tiles.api_p95")}
          value={f.seconds(r.apiP95LatencyMs)}
          detail={t("admin.dashboard.tiles.api_p95_detail", { window })}
          icon={Timer}
          to="/admin/audit-logs"
          search={{ tab: "http" }}
        />
      </div>

      <ScopeNote
        c={c}
        scopeKey="api_scope"
        noteKey="admin.dashboard.scope.api"
      />
    </section>
  );
}
