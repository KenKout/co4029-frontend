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

/** Knowledge-retention distribution across the cohort for one lesson. */
export function CohortHistogram({
  data,
}: {
  data: { bucket_lower: number; count: number }[];
}) {
  const { t } = useTranslation();
  const chartData = data.map((b) => ({
    bucket: `${Math.round(b.bucket_lower * 100)}%`,
    count: b.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.5}
        />
        <XAxis
          dataKey="bucket"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          stroke="var(--border)"
          label={{
            value: t("teacher_sr_cohort.kr_axis"),
            position: "insideBottom",
            offset: -2,
            fill: "var(--text-muted)",
            fontSize: 11,
          }}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          stroke="var(--border)"
          allowDecimals={false}
          label={{
            value: t("teacher_sr_cohort.students_axis"),
            angle: -90,
            position: "insideLeft",
            fill: "var(--text-muted)",
            fontSize: 11,
          }}
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
          formatter={(value) => [
            String(value),
            t("teacher_sr_cohort.students_axis"),
          ]}
          labelFormatter={(label) =>
            `${t("teacher_sr_cohort.kr_tooltip_label")}: ${String(label ?? "")}`
          }
        />
        <Bar
          dataKey="count"
          fill="var(--primary)"
          radius={[6, 6, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
