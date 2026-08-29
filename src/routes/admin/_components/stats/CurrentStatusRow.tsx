import { CheckCircle2, CircleDashed, HelpCircle, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { RowHeading } from "./RowHeading";
import type { AdminStatsController, ServiceStatus } from "./types";

/**
 * Row 1: Current Status — the "is it up" answer, deliberately separate from
 * Needs Action (ADM-002).
 *
 * This is the row that is *allowed* to be all green. Healthy and zero states
 * belong here precisely so they stop crowding out the action list, where a
 * screenful of "0 / Healthy" cards used to bury the one thing that mattered.
 */

const STATE_STYLE: Record<
  ServiceStatus["state"],
  { icon: LucideIcon; chip: string; srKey: string }
> = {
  ok: {
    icon: CheckCircle2,
    chip: "text-emerald-700 bg-emerald-50 border-emerald-200",
    srKey: "admin.dashboard.status.ok",
  },
  degraded: {
    icon: CircleDashed,
    chip: "text-amber-700 bg-amber-50 border-amber-200",
    srKey: "admin.dashboard.status.degraded",
  },
  down: {
    icon: XCircle,
    chip: "text-red-700 bg-red-50 border-red-200",
    srKey: "admin.dashboard.status.down",
  },
  disabled: {
    icon: CircleDashed,
    chip: "text-text-muted bg-surface-muted border-border",
    srKey: "admin.dashboard.status.disabled",
  },
  unknown: {
    icon: HelpCircle,
    chip: "text-text-muted bg-surface-muted border-border",
    srKey: "admin.dashboard.status.unknown",
  },
};

function ServiceChip({
  service,
  c,
}: {
  service: ServiceStatus;
  c: AdminStatsController;
}) {
  const style = STATE_STYLE[service.state];
  const Icon = style.icon;
  const stateLabel = c.t(style.srKey);
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
        style.chip,
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{service.label}</span>
      {/* The colour alone is not the message: every chip states its status in
          text for screen readers and for anyone who cannot separate the hues. */}
      <span className="sr-only">{stateLabel}</span>
      {service.latencyMs != null && (
        <span className="ml-auto tabular-nums opacity-70">
          {c.f.seconds(service.latencyMs)}
        </span>
      )}
    </li>
  );
}

export function CurrentStatusRow({ c }: { c: AdminStatsController }) {
  const { t, currentStatus } = c;
  // `partial` borrows the degraded chip on purpose: everything checked is fine,
  // but the row must not read as a clean bill of health while a dependency
  // sits unverified.
  const overallStyle =
    STATE_STYLE[
      currentStatus.overall === "ok"
        ? "ok"
        : currentStatus.overall === "degraded" ||
            currentStatus.overall === "partial"
          ? "degraded"
          : currentStatus.overall === "down"
            ? "down"
            : "unknown"
    ];
  const OverallIcon = overallStyle.icon;

  return (
    <section className="space-y-3" aria-labelledby="admin-current-status">
      <RowHeading id="admin-current-status">
        {t("admin.dashboard.rows.current_status")}
      </RowHeading>

      {currentStatus.isLoading ? (
        <Skeleton className="h-20 rounded-xl" />
      ) : (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold",
                overallStyle.chip,
              )}
            >
              <OverallIcon aria-hidden="true" className="h-4 w-4" />
              {t(`admin.dashboard.overall.${currentStatus.overall}`)}
            </span>
            {currentStatus.overall === "partial" &&
              currentStatus.uncheckedServices.length > 0 && (
                /* Name the unverified dependency rather than hiding the
                   caveat behind a softer headline word. */
                <span className="text-xs text-text-muted">
                  {t("admin.dashboard.unchecked", {
                    services: currentStatus.uncheckedServices.join(", "),
                  })}
                </span>
              )}
            {currentStatus.version && (
              <span className="text-xs text-text-muted">
                {t("admin.dashboard.version", {
                  version: currentStatus.version,
                })}
              </span>
            )}
            {currentStatus.isError && (
              /* The probe failing is itself a status, not a blank row: saying
                 "unknown" is honest, saying "healthy" would not be. */
              <span className="text-xs text-text-muted">
                {t("admin.dashboard.status_probe_unavailable")}
              </span>
            )}
          </div>

          {currentStatus.services.length > 0 && (
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              {currentStatus.services.map((service) => (
                <ServiceChip key={service.key} service={service} c={c} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
