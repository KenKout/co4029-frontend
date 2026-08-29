import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApiLatencyTrend } from "@/lib/api/hooks/admin";
import { useFormatCount } from "@/lib/format/number";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const DAYS_OPTIONS = [7, 30, 90] as const;
type TrendDays = (typeof DAYS_OPTIONS)[number];

/** Milliseconds → "820ms" / "1.24s" — compact for ticks and tooltips. */
function formatMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return EM_DASH;
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

const EM_DASH = "—";

/** Tooltip for one trend point: date + p95/p50 latency + request volume. */
function LatencyTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value?: number | null;
    payload?: { requests?: number };
  }>;
  label?: string;
}) {
  const { t } = useTranslation();
  const formatCount = useFormatCount();
  if (!active || !payload?.length) return null;
  const byKey = Object.fromEntries(
    payload.map((p) => [p.dataKey, p.value]),
  );
  const p95 = byKey.p95 as number | null | undefined;
  const p50 = byKey.p50 as number | null | undefined;
  // `requests` is not a series (only p95/p50 are dataKeys), so it never
  // appears in the payload array — read it from the hovered datum itself.
  const requests = payload[0]?.payload?.requests ?? 0;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-text-strong">{label}</p>
      <p className="text-text-muted mt-0.5">
        {t("admin.stats.latency.trend_tooltip", {
          p95: formatMs(p95),
          p50: formatMs(p50),
          requests: formatCount(requests ?? 0),
        })}
      </p>
    </div>
  );
}

/** 7/30/90 lookback tabs, one implementation shared with the active-users chart. */
function TrendPeriodTabs({
  days,
  onChange,
}: {
  days: TrendDays;
  onChange: (d: TrendDays) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={t("admin.stats.latency.trend_period_aria")}
      className="inline-flex flex-wrap gap-2 bg-surface-elev border border-border rounded-lg p-1"
    >
      {DAYS_OPTIONS.map((d) => {
        const active = d === days;
        return (
          <Button
            key={d}
            type="button"
            variant="ghost"
            onClick={() => onChange(d)}
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
  );
}

/**
 * Daily API latency over a lookback window — the same trend treatment as the
 * active-users chart, fed by the wire-level http_audit_log. p95 is the area
 * (the headline number from the Reliability row), p50 the subdued line; a
 * zero-traffic day holds the percentile open (no fabricated 0ms floor).
 */
export function LatencyTrendSection() {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState<TrendDays>(30);
  const trend = useApiLatencyTrend(days);
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
        label: labelFmt.format(new Date(`${p.day}T00:00:00`)),
        p95: p.p95_latency_ms ?? null,
        p50: p.p50_latency_ms ?? null,
        requests: p.requests_total,
      })),
    [trend.data, labelFmt],
  );

  const hadTraffic = useMemo(
    () => (trend.data?.points ?? []).some((p) => p.requests_total > 0),
    [trend.data],
  );

  return (
    <section className="rounded-xl bg-surface-elev ghost-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-headline font-bold text-text-strong">
            {t("admin.stats.latency.trend_title")}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {t("admin.stats.latency.trend_desc")}
          </p>
        </div>

        <TrendPeriodTabs days={days} onChange={setDays} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0.5 w-4 rounded-full bg-[var(--color-primary)]"
          />
          {t("admin.stats.latency.legend_p95")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block w-4 border-t-2 border-dashed border-[var(--color-text-muted)]"
          />
          {t("admin.stats.latency.legend_p50")}
        </span>
      </div>

      {trend.isError ? (
        <div className="rounded-lg border border-border bg-surface-elev p-6 text-center">
          <p className="text-sm text-danger">{t("admin.stats.load_failed")}</p>
        </div>
      ) : trend.isLoading ? (
        <PageSkeleton rows={1} height="h-64" bg="bg-surface-muted" />
      ) : !hadTraffic ? (
        <div className="rounded-lg border border-border bg-surface-elev p-8 text-center">
          <p className="text-sm text-text-muted">
            {t("admin.stats.latency.trend_empty")}
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
                id="latencyTrendFill"
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
              tickFormatter={(value: number) => formatMs(value)}
              width={44}
            />
            <Tooltip
              content={<LatencyTrendTooltip />}
              cursor={{ stroke: "var(--color-primary)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="p95"
              name="p95"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#latencyTrendFill)"
              isAnimationActive={!reducedMotion}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="p50"
              name="p50"
              stroke="var(--color-text-muted)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={!reducedMotion}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

export default LatencyTrendSection;