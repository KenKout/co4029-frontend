import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { TrendTooltip } from "./ChartTooltips";
import { resolveLocale } from "./helpers";
import { useFormatters } from "./use-formatters";
import type { AiCostsTimeBucket } from "./types";

/**
 * Spend-over-time area chart. `intraday` (a single-day window) adds the hour
 * part to the bucket labels; a multi-day window shows day buckets only.
 */
export function TrendAreaChart({
  data,
  intraday,
}: {
  data: AiCostsTimeBucket[];
  intraday: boolean;
}) {
  const { t, i18n } = useTranslation();
  const fmt = useFormatters();
  const reducedMotion = useReducedMotion();

  const locale = resolveLocale(i18n.resolvedLanguage, i18n.language);
  const labelFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        ...(intraday ? { hour: "2-digit" } : {}),
      }),
    [locale, intraday],
  );

  const chartData = useMemo(
    () =>
      data.map((b) => ({
        ...b,
        label: labelFmt.format(new Date(b.bucket_start_ts)),
      })),
    [data, labelFmt],
  );

  if (data.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">
          {t("admin.ai_costs.empty.trend")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <defs>
            <linearGradient id="aiCostTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-primary)"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="var(--color-primary)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
          />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => fmt.usd.format(value)}
            width={80}
          />
          <Tooltip
            content={<TrendTooltip />}
            cursor={{ stroke: "var(--color-primary)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="usd"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#aiCostTrendFill)"
            isAnimationActive={!reducedMotion}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
