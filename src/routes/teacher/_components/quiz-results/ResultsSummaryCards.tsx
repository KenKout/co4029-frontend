import { useTranslation } from "react-i18next";
import { Users, Target, TrendingUp, Clock, Award, Percent } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type { QuizResultsSummary } from "@/lib/api/types";

/** Format a 0..100 score as a whole-or-1-decimal percent, or an em dash when null. */
function fmtPercent(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}%`;
}

/** Format seconds as `Xm Ys` (or `Ys` under a minute), or an em dash when null. */
function fmtDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return "—";
  }
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins <= 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

interface ResultsSummaryCardsProps {
  summary: QuizResultsSummary;
  passingScorePercent: number;
  gradingMethod: "highest" | "average" | "first" | "last";
}

export function ResultsSummaryCards({
  summary,
  passingScorePercent,
  gradingMethod,
}: ResultsSummaryCardsProps) {
  const { t } = useTranslation();

  const iqrSublabel =
    summary.p25 !== null && summary.p75 !== null
      ? t("teacher_quiz_results.summary.iqr", {
          lower: fmtPercent(summary.p25),
          upper: fmtPercent(summary.p75),
        })
      : undefined;

  const meanSublabel = t("teacher_quiz_results.summary.grading_method_label", {
    method: gradingMethod,
    passing: passingScorePercent,
  });

  const passRatePercent =
    summary.pass_rate === null || summary.pass_rate === undefined
      ? null
      : summary.pass_rate * 100;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard
        label={t("teacher_quiz_results.summary.students")}
        value={summary.unique_students}
        icon={Users}
      />
      <StatCard
        label={t("teacher_quiz_results.summary.attempts")}
        value={summary.total_attempts}
        icon={Target}
      />
      <StatCard
        label={t("teacher_quiz_results.summary.mean")}
        value={fmtPercent(summary.mean_score)}
        sublabel={meanSublabel}
        icon={TrendingUp}
      />
      <StatCard
        label={t("teacher_quiz_results.summary.median")}
        value={fmtPercent(summary.median_score)}
        sublabel={iqrSublabel}
        icon={Award}
      />
      <StatCard
        label={t("teacher_quiz_results.summary.pass_rate")}
        value={fmtPercent(passRatePercent)}
        icon={Percent}
      />
      <StatCard
        label={t("teacher_quiz_results.summary.avg_time")}
        value={fmtDuration(summary.mean_time_seconds)}
        icon={Clock}
      />
    </div>
  );
}
