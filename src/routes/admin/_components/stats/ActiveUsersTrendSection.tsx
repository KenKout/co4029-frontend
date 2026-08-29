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
import { useActiveUsersTrend, type TrendRange } from "@/lib/api/hooks/admin";
import { useFormatCount } from "@/lib/format/number";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { PageSkeleton } from "@/components/ui/page-skeleton";

/** Tooltip for one trend point: formatted date + raw count. */
function ActiveUsersTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  const { t } = useTranslation();
  const formatCount = useFormatCount();
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-text-strong">{label}</p>
      <p className="text-text-muted mt-0.5">
        {t("admin.stats.active.trend_tooltip", {
          n: formatCount(value),
        })}
      </p>
    </div>
  );
}

/**
 * Daily active users over a lookback window — the same trend treatment the
 * AI-cost page gives spend. One point per calendar day (zero days included);
 * the period tabs refetch with a wider/narrower window.
 */
/**
 * The window comes from the page's date-range filter, not a control of its
 * own. A chart with a private window sat under a KPI computed over the page
 * range and quietly described a different span of time — the exact mismatch
 * ADM-004 is about. The range label lives once, at the top of the page.
 */
export function ActiveUsersTrendSection({ range }: { range: TrendRange }) {
  const { t, i18n } = useTranslation();
  const trend = useActiveUsersTrend(range);
  const formatCount = useFormatCount();
  const reducedMotion = useReducedMotion();

  const locale =
    i18n.resolvedLanguage === "vi"
      ? "vi-VN"
      : (i18n.resolvedLanguage ?? "en-US");
  const labelFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  const chartData = useMemo(
    () =>
      (trend.data?.points ?? []).map((p) => ({
        label: labelFmt.format(new Date(`${p.date}T00:00:00`)),
        count: p.count,
      })),
    [trend.data, labelFmt],
  );

  const totalActive = useMemo(
    () => (trend.data?.points ?? []).reduce((sum, p) => sum + p.count, 0),
    [trend.data],
  );

  return (
    <section className="rounded-xl bg-surface-elev ghost-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-headline font-bold text-text-strong">
            {t("admin.stats.active.trend_title")}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {t("admin.stats.active.trend_desc")}
          </p>
        </div>
      </div>

      {trend.isError ? (
        <div className="rounded-lg border border-border bg-surface-elev p-6 text-center">
          <p className="text-sm text-danger">{t("admin.stats.load_failed")}</p>
        </div>
      ) : trend.isLoading ? (
        <PageSkeleton rows={1} height="h-64" bg="bg-surface-muted" />
      ) : totalActive === 0 ? (
        <div className="rounded-lg border border-border bg-surface-elev p-8 text-center">
          <p className="text-sm text-text-muted">
            {t("admin.stats.active.trend_empty")}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <defs>
              <linearGradient
                id="activeUsersTrendFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
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
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
              stroke="var(--color-border)"
              tickFormatter={(value: number) => formatCount(value)}
              width={40}
            />
            <Tooltip
              content={<ActiveUsersTrendTooltip />}
              cursor={{ stroke: "var(--color-primary)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#activeUsersTrendFill)"
              isAnimationActive={!reducedMotion}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

export default ActiveUsersTrendSection;
