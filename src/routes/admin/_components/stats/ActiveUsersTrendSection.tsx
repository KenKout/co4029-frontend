import { useMemo, useState } from "react";
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
import { useActiveUsersTrend } from "@/lib/api/hooks/admin";
import { useFormatCount } from "@/lib/format/number";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const DAYS_OPTIONS = [7, 30, 90] as const;
type TrendDays = (typeof DAYS_OPTIONS)[number];

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
export function ActiveUsersTrendSection() {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState<TrendDays>(30);
  const trend = useActiveUsersTrend(days);
  const formatCount = useFormatCount();
  const reducedMotion = useReducedMotion();

  const locale =
    i18n.resolvedLanguage === "vi" ? "vi-VN" : i18n.resolvedLanguage ?? "en-US";
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

        <div
          role="radiogroup"
          aria-label={t("admin.stats.active.trend_period_aria")}
          className="inline-flex flex-wrap gap-2 bg-surface-elev border border-border rounded-lg p-1"
        >
          {DAYS_OPTIONS.map((d) => {
            const active = d === days;
            return (
              <Button
                key={d}
                type="button"
                variant="ghost"
                onClick={() => setDays(d)}
                className={
                  active
                    ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white h-auto"
                    : "px-3 py-1.5 text-xs font-semibold rounded-md text-text-strong hover:bg-surface-muted transition-colors duration-200 h-auto"
                }
              >
                {t(`admin.stats.active.period.${d}`)}
              </Button>
            );
          })}
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
