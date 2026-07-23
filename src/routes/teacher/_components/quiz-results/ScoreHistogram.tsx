import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QuizScoreBucket } from "@/lib/api/types";

interface ScoreHistogramProps {
  histogram: QuizScoreBucket[];
  passingScorePercent: number;
}

/**
 * Bar chart of a quiz's score distribution (11 buckets: 0–9 … 90–100), with a
 * vertical reference line at the passing threshold. Bars in buckets at or above
 * the passing band are tinted success-green; buckets below are muted.
 *
 * Theming mirrors CohortHistogram in teacher/sr-cohort.tsx (CSS-var tokens,
 * no animation, rounded top corners).
 */
export function ScoreHistogram({
  histogram,
  passingScorePercent,
}: ScoreHistogramProps) {
  const { t } = useTranslation();

  // The X axis is categorical (bucket labels), so a ReferenceLine at a numeric
  // score must be anchored to the bucket that contains the threshold.
  const passingBucket = histogram.find(
    (b) => passingScorePercent >= b.lower && passingScorePercent <= b.upper,
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={histogram}
        margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.5}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          stroke="var(--border)"
          label={{
            value: t("teacher_quiz_results.histogram.x_axis"),
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
            value: t("teacher_quiz_results.histogram.y_axis"),
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
            t("teacher_quiz_results.histogram.tooltip_students"),
          ]}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={false}>
          {histogram.map((bucket) => {
            const isPassing =
              passingBucket !== undefined &&
              bucket.lower >= passingBucket.lower;
            return (
              <Cell
                key={bucket.label}
                fill={isPassing ? "var(--success)" : "var(--primary)"}
              />
            );
          })}
        </Bar>
        {passingBucket && (
          <ReferenceLine
            x={passingBucket.label}
            stroke="var(--warning)"
            strokeDasharray="4 4"
            label={{
              value: t("teacher_quiz_results.histogram.pass_line"),
              position: "top",
              fill: "var(--warning)",
              fontSize: 11,
            }}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
