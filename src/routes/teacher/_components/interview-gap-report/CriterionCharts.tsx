import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { scoreBand } from "./helpers";
import type { CriterionChartRow } from "./types";

/**
 * Visual per-criterion score charts: radar for the overall shape and a
 * horizontal bar for exact comparison. Both read the same 0–5 means.
 */
export function CriterionCharts({
  chartData,
  showRadar,
}: {
  chartData: CriterionChartRow[];
  showRadar: boolean;
}) {
  return (
    <div className={showRadar ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
      {showRadar && (
        <div className="rounded-xl bg-m3-surface-container-lowest p-2">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={chartData} outerRadius="72%">
              <PolarGrid stroke="var(--border)" opacity={0.6} />
              <PolarAngleAxis
                dataKey="label"
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              />
              <PolarRadiusAxis
                domain={[0, 5]}
                tickCount={6}
                tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                stroke="var(--border)"
              />
              <Radar
                dataKey="score"
                stroke="var(--primary)"
                fill="var(--primary)"
                fillOpacity={0.35}
                isAnimationActive={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-elev)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--text-strong)",
                }}
                formatter={(value) => [`${value} / 5`, ""]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="rounded-xl bg-m3-surface-container-lowest p-2">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              stroke="var(--border)"
              opacity={0.5}
            />
            <XAxis
              type="number"
              domain={[0, 5]}
              tickCount={6}
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              stroke="var(--border)"
            />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              stroke="var(--border)"
            />
            <Tooltip
              cursor={{ fill: "var(--surface-muted)", opacity: 0.4 }}
              contentStyle={{
                backgroundColor: "var(--surface-elev)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--text-strong)",
              }}
              formatter={(value) => [`${value} / 5`, ""]}
            />
            <Bar
              dataKey="score"
              radius={[0, 6, 6, 0]}
              isAnimationActive={false}
            >
              {chartData.map((row) => {
                const band = scoreBand(row.score);
                return (
                  <Cell
                    key={row.key}
                    fill={
                      band.bar === "bg-emerald-500"
                        ? "var(--success)"
                        : band.bar === "bg-amber-500"
                          ? "var(--warning)"
                          : "var(--danger)"
                    }
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
