import {
  Activity,
  HeartPulse,
  Layers,
  MessagesSquare,
  XCircle,
} from "lucide-react";

import { ActionTile } from "@/components/ui/action-tile";

import { RowHeading } from "./RowHeading";
import type { AdminStatsController } from "./types";

/** Row 1: the operational tiles an admin has to act on. */
export function NeedsActionRow({ c }: { c: AdminStatsController }) {
  const {
    t,
    f,
    data,
    failureRate,
    failureSeverity,
    failureTrendPct,
    queueSeverity,
    failedCallsSeverity,
  } = c;
  const {
    ok: healthOk,
    known: healthKnown,
    severity: healthSeverity,
  } = c.health;
  const {
    passRate,
    evaluated,
    students,
    isMeaningful: passRateIsMeaningful,
    severity: passRateSeverity,
  } = c.passRate;

  return (
    <section className="space-y-3">
      <RowHeading>{t("admin.dashboard.rows.needs_action")}</RowHeading>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
          trend={{
            deltaPct: failureTrendPct,
            higherIsWorse: true,
            noBaselineLabel: t("admin.dashboard.tiles.no_baseline"),
          }}
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
        {/* Interview pass rate lives HERE, not in "activity": a genuinely low
            pass rate means the assessment pipeline or outcome verification is
            broken, which is an operator problem. But it is only trustworthy
            once enough distinct students have been evaluated, so below that
            threshold it stays neutral and says why. */}
        <ActionTile
          label={t("admin.dashboard.tiles.interview_pass_rate")}
          value={f.pct(passRate, 1)}
          detail={
            passRateIsMeaningful
              ? t("admin.dashboard.tiles.pass_rate_detail", {
                  evaluated: f.count(evaluated),
                })
              : t("admin.dashboard.tiles.pass_rate_low_sample", {
                  evaluated: f.count(evaluated),
                  students: f.count(students),
                })
          }
          severity={passRateSeverity}
          icon={MessagesSquare}
          to="/admin/courses"
          statusText={
            passRateIsMeaningful
              ? undefined
              : t("admin.dashboard.tiles.low_sample_chip")
          }
        />
      </div>
    </section>
  );
}
