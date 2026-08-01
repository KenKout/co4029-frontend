import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ActionTileTrend, type ActionTrend } from "./action-tile/trend";

/**
 * Severity of an operational metric.
 *
 * `ok` is deliberately NEUTRAL rather than green: on a dashboard where most
 * things are usually fine, colouring every healthy tile green makes the page a
 * wall of colour and the one genuinely bad number stops standing out. Colour is
 * spent only on states that want an operator's attention.
 */
export type ActionSeverity = "ok" | "warn" | "critical";

const TONE: Record<
  ActionSeverity,
  { card: string; value: string; chip: string }
> = {
  ok: {
    card: "bg-card ghost-border hover:border-border-strong",
    value: "text-m3-on-surface",
    chip: "bg-surface-muted text-text-muted",
  },
  warn: {
    card: "bg-amber-50/60 border-amber-300 hover:border-amber-400",
    value: "text-amber-700",
    chip: "bg-amber-100 text-amber-800",
  },
  critical: {
    card: "bg-red-50/60 border-red-300 hover:border-red-400",
    value: "text-red-700",
    chip: "bg-red-100 text-red-800",
  },
};

/**
 * A "needs action" tile: one operational number, its severity, and a link to the
 * page where an operator can act on it.
 *
 * Always a link — a tile that shows a problem but can't be drilled into just
 * moves the work elsewhere.
 */
export function ActionTile({
  label,
  value,
  detail,
  severity = "ok",
  icon: Icon,
  to,
  search,
  statusText,
  trend,
}: {
  label: string;
  value: string;
  /** Secondary line: the ratio/window behind the headline number. */
  detail?: string;
  severity?: ActionSeverity;
  icon?: LucideIcon;
  to: string;
  search?: Record<string, string>;
  /** Short state word rendered as a chip, e.g. "degraded". */
  statusText?: string;
  /**
   * Trend vs the previous comparable window. `null` means no baseline (e.g. the
   * prior period had no data) — rendered as an explicit "no baseline" note
   * rather than a misleading flat or improving arrow.
   */
  trend?: ActionTrend;
}) {
  const tone = TONE[severity];
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      search={search as never}
      className={cn(
        "group flex flex-col justify-between rounded-xl border p-5 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/50",
        tone.card,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-m3-on-surface-variant">
          {label}
        </p>
        {Icon && (
          <Icon
            aria-hidden="true"
            className={cn("h-4 w-4 shrink-0", tone.value)}
          />
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              "text-2xl font-heading font-semibold tabular-nums",
              tone.value,
            )}
          >
            {value}
          </p>
          {detail && (
            <p className="mt-0.5 text-xs text-text-muted truncate">{detail}</p>
          )}
          {trend && <ActionTileTrend trend={trend} />}
        </div>
        <span className="flex items-center gap-1.5 shrink-0">
          {statusText && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                tone.chip,
              )}
            >
              {statusText}
            </span>
          )}
          <ChevronRight
            aria-hidden="true"
            className="h-4 w-4 text-text-subtle transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}

export default ActionTile;
