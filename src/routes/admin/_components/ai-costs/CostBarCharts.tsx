import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type {
  AiCostsByCategory as AiCostsByCategoryRow,
  AiCostsRoleBreakdown,
  AiCostsStageBreakdown,
} from "@/lib/api/types";
import { ChartTooltipUsd } from "./ChartTooltips";
import { useFormatters } from "./use-formatters";

/** Spend per caller role (student / teacher / system). */
export function RoleBarChart({ data }: { data: AiCostsRoleBreakdown[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const reducedMotion = useReducedMotion();
  if (data.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">
          {t("admin.ai_costs.empty.by_role")}
        </p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="role"
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
            content={<ChartTooltipUsd />}
            cursor={{ fill: "var(--color-surface-muted)" }}
          />
          <Bar
            dataKey="usd"
            fill="var(--color-primary)"
            radius={[6, 6, 0, 0]}
            isAnimationActive={!reducedMotion}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Spend per generation pipeline stage. */
export function StageBarChart({ data }: { data: AiCostsStageBreakdown[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const reducedMotion = useReducedMotion();
  if (data.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">
          {t("admin.ai_costs.empty.by_stage")}
        </p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="stage_name"
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
            content={<ChartTooltipUsd />}
            cursor={{ fill: "var(--color-surface-muted)" }}
          />
          <Bar
            dataKey="usd"
            fill="var(--color-primary)"
            radius={[6, 6, 0, 0]}
            isAnimationActive={!reducedMotion}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Top 15 rows of the active breakdown dimension, as a horizontal bar chart. */
export function CategoryBarChart({ data }: { data: AiCostsByCategoryRow[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const reducedMotion = useReducedMotion();
  if (data.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">
          {t("admin.ai_costs.empty.by_category")}
        </p>
      </div>
    );
  }
  const chartData = data.slice(0, 15);
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => fmt.usd.format(value)}
          />
          <YAxis
            type="category"
            dataKey="dimension_value"
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            width={140}
          />
          <Tooltip
            content={<ChartTooltipUsd />}
            cursor={{ fill: "var(--color-surface-muted)" }}
          />
          <Bar
            dataKey="total_usd"
            fill="var(--color-primary)"
            radius={[0, 6, 6, 0]}
            isAnimationActive={!reducedMotion}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
