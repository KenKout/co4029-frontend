import { useTranslation } from "react-i18next";
import { useFormatters } from "./use-formatters";
import type { AiCostsTimeBucket } from "./types";

/** Recharts tooltip showing a single USD value for the hovered category/bar. */
export function ChartTooltipUsd({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: Record<string, unknown> }[];
  label?: string;
}) {
  const fmt = useFormatters();
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value;
  return (
    <div className="bg-surface-elev border border-border rounded-md px-3 py-2 shadow-editorial">
      <p className="text-xs font-semibold text-text-strong">{label}</p>
      <p className="text-xs text-text-muted mt-0.5">{fmt.usd.format(value)}</p>
    </div>
  );
}

/** Recharts tooltip for the spend trend — shows both USD and token totals. */
export function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey?: string; payload: AiCostsTimeBucket }[];
  label?: string;
}) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-surface-elev border border-border rounded-md px-3 py-2 shadow-editorial space-y-1">
      <p className="text-xs font-semibold text-text-strong">{label}</p>
      <p className="text-xs text-primary">
        {t("admin.ai_costs.trend_legend.cost")}: {fmt.usd.format(point.usd)}
      </p>
      <p className="text-xs text-text-muted">
        {t("admin.ai_costs.trend_legend.tokens")}:{" "}
        {fmt.number.format(point.tokens)}
      </p>
    </div>
  );
}
