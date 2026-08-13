import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { type LucideIcon } from "lucide-react";
import { MaterialTypeIcon } from "@/components/ui/material-type-icon";
import { cn } from "@/lib/utils";
import { useFormatCount } from "@/lib/format/number";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { RING_PALETTE, readBucket, type BreakdownBucket } from "./breakdown";

type RingRow = { id: string; label: string; count: number };

/** Tooltip over a ring segment: label, share and count. */
function RingTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: { label?: string; count?: number; pct?: number };
  }>;
}) {
  const { t } = useTranslation();
  const formatCount = useFormatCount();
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point || point.count === undefined) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-text-strong">{point.label}</p>
      <p className="text-text-muted mt-0.5">
        {t("admin.stats.content.ring_tooltip", {
          n: formatCount(point.count),
          pct: point.pct ?? 0,
        })}
      </p>
    </div>
  );
}

/**
 * One content breakdown as a ring chart: segment share = count / total,
 * with the grand total centred in the hole and a legend (label, share %,
 * count) beside it. Replaces the old proportion-bar table.
 */
export function BreakdownRingCard({
  title,
  icon: Icon,
  buckets,
  showTypeIcons = false,
  stacked = false,
}: {
  title: string;
  icon: LucideIcon;
  buckets: BreakdownBucket[] | undefined;
  /** Render a per-row material-type icon chip (materials breakdown only). */
  showTypeIcons?: boolean;
  /** Stack the ring above the legend (narrow grid columns) instead of
   *  side-by-side. */
  stacked?: boolean;
}) {
  const { t } = useTranslation();
  const formatCount = useFormatCount();

  const rows: RingRow[] = useMemo(() => {
    const out: RingRow[] = [];
    for (const [idx, bucket] of (buckets ?? []).entries()) {
      const { label, count } = readBucket(bucket);
      if (typeof count !== "number") continue;
      out.push({ id: String(idx), label, count });
    }
    return out;
  }, [buckets]);

  const total = rows.reduce((acc, r) => acc + r.count, 0);

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        label: r.label,
        count: r.count,
        pct: total > 0 ? Math.round((r.count / total) * 100) : 0,
      })),
    [rows, total],
  );

  const reducedMotion = useReducedMotion();

  return (
    <div className="bg-surface-elev border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-m3-primary-fixed flex items-center justify-center">
          <Icon className="h-4 w-4 text-m3-primary" />
        </div>
        <h2 className="font-headline font-semibold text-text-strong">
          {title}
        </h2>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-text-muted">
            {t("admin.stats.empty_in_scope")}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center gap-6 px-5 py-5",
            stacked ? "flex-col" : "flex-col sm:flex-row",
          )}
        >
          {/* Ring + centred total */}
          <div className="relative h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={56}
                  outerRadius={78}
                  paddingAngle={2}
                  strokeWidth={0}
                  isAnimationActive={!reducedMotion}
                >
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={RING_PALETTE[i % RING_PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<RingTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-headline font-bold text-text-strong tabular-nums">
                {formatCount(total)}
              </span>
              <span className="text-[11px] text-text-muted">
                {t("admin.stats.content.total")}
              </span>
            </div>
          </div>

          {/* Legend: label · count · share */}
          <ul
            className={cn(
              "flex-1 w-full min-w-0 space-y-2",
              stacked && "text-center sm:text-left",
            )}
          >
            {rows.map((r, i) => (
              <li
                key={r.id}
                className="flex items-center gap-2.5 text-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{
                    background: RING_PALETTE[i % RING_PALETTE.length],
                  }}
                />
                {showTypeIcons && (
                  <MaterialTypeIcon materialType={r.label} />
                )}
                <span className="flex-1 min-w-0 truncate font-medium text-text-strong">
                  {r.label}
                </span>
                <span className="w-10 text-right font-semibold text-text-strong tabular-nums">
                  {formatCount(r.count)}
                </span>
                <span className="w-11 text-right text-xs tabular-nums text-text-muted">
                  {total > 0 ? Math.round((r.count / total) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default BreakdownRingCard;
