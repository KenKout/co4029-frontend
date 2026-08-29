import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

import { RowHeading } from "./RowHeading";
import type { AdminStatsController, OperatorAlert } from "./types";

/**
 * Row 2: Needs Action — only things somebody has to act on (ADM-001/ADM-002).
 *
 * What is deliberately absent is the point. There are no healthy tiles, no
 * zero counts and no "No data" rows here: those are states, not tasks, and
 * they live in Current Status. When nothing is wrong this row says
 * "No active incidents" and takes up four lines, which is the correct amount
 * of an operator's screen for a platform that is fine.
 *
 * Every row carries the four things ADM-001 requires — severity, the target
 * subsystem, the evidence behind the number, and a link that lands on the
 * filtered rows rather than a generic page.
 */

const SEVERITY_STYLE = {
  critical: {
    row: "border-l-4 border-l-red-500",
    chip: "bg-red-100 text-red-800",
    icon: "text-red-600",
  },
  warn: {
    row: "border-l-4 border-l-amber-400",
    chip: "bg-amber-100 text-amber-800",
    icon: "text-amber-600",
  },
} as const;

function AlertRow({
  alert,
  c,
}: {
  alert: OperatorAlert;
  c: AdminStatsController;
}) {
  const style = SEVERITY_STYLE[alert.severity];
  return (
    <li>
      <Link
        to={alert.to}
        search={alert.search as never}
        className={cn(
          "group flex items-start gap-4 bg-card px-5 py-4 transition-colors",
          "hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/50",
          style.row,
        )}
      >
        <AlertTriangle
          aria-hidden="true"
          className={cn("mt-0.5 h-4 w-4 shrink-0", style.icon)}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                style.chip,
              )}
            >
              {c.t(`admin.dashboard.severity.${alert.severity}`)}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {alert.target}
            </span>
            {alert.age && (
              <span className="text-xs tabular-nums text-text-muted">
                {c.t("admin.dashboard.alerts.age", { age: alert.age })}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm font-semibold text-text-strong">
            {alert.label} <span className="tabular-nums">{alert.value}</span>
          </p>
          {/* The evidence line: an operator should never have to take a
              percentage on faith before clicking through. */}
          <p className="mt-0.5 text-xs text-text-muted">{alert.detail}</p>
        </div>

        <span className="flex shrink-0 items-center gap-1 self-center text-xs font-semibold text-m3-primary">
          {alert.ctaLabel}
          <ChevronRight
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </Link>
    </li>
  );
}

export function NeedsActionSection({ c }: { c: AdminStatsController }) {
  const { t, alerts } = c;

  return (
    <section className="space-y-3" aria-labelledby="admin-needs-action">
      <RowHeading id="admin-needs-action">
        {t("admin.dashboard.rows.needs_action")}
      </RowHeading>

      {alerts.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {alerts.map((alert) => (
            <AlertRow key={alert.key} alert={alert} c={c} />
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-5 py-4">
          <ShieldCheck
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-emerald-600"
          />
          <p className="text-sm text-text-muted">
            {t("admin.dashboard.no_active_incidents")}
          </p>
        </div>
      )}
    </section>
  );
}
