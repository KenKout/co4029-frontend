import { useTranslation } from "react-i18next";

import { GlassCard } from "@/components/ui/glass-card";
import type { GapReportAuthoringRead } from "@/lib/api/types";
import { CriterionCharts } from "./CriterionCharts";
import { CriterionExtraNotes } from "./CriterionExtraNotes";
import { CriterionRow } from "./CriterionRow";
import { CriterionScoreRollup } from "./CriterionScoreRollup";
import {
  buildChartData,
  buildCriterionEntries,
  buildExtraNotes,
  groupNotesByCriterion,
  readScoreSummary,
} from "./helpers";

export function CriterionBreakdown({
  report,
}: {
  report: GapReportAuthoringRead;
}) {
  const { t } = useTranslation();
  const breakdown = report.per_criterion_breakdown ?? {};
  const weights = (report.rubric_weights ?? {}) as Record<string, number>;
  const summary = (report.score_summary ?? {}) as Record<string, unknown>;
  const strengths = groupNotesByCriterion(report.strengths ?? []);
  const weaknesses = groupNotesByCriterion(report.weaknesses ?? []);

  const entries = buildCriterionEntries(breakdown);

  const rollup = readScoreSummary(summary);
  const { totalScore, outcomesTotal, questionsTotal } = rollup;

  // Notes tagged with a non-rubric criterion (e.g. "theory_performance") plus
  // any untagged bullets — shown once at the bottom so nothing is dropped.
  const rubricKeys = new Set(entries.map((e) => e.key));
  const extraStrengths = buildExtraNotes(strengths, rubricKeys, t);
  const extraWeaknesses = buildExtraNotes(weaknesses, rubricKeys, t);

  // Chart data: one row per rubric criterion with its 0–5 mean. Shared by the
  // radar (shape at a glance) and the horizontal bar (exact comparison).
  const chartData = buildChartData(entries, t);
  // Radar needs 3+ axes to form a shape; with 1–2 criteria a bar chart alone
  // reads better, so only show the radar when there are enough axes.
  const showRadar = chartData.length >= 3;

  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline font-bold text-base text-m3-primary mb-2">
          {t("teacher_interview_gap_report.sections.by_criterion")}
        </h2>
        <span className="text-xs text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.labels.criteria_count", {
            count: entries.length,
          })}
        </span>
      </div>

      {(totalScore !== null ||
        outcomesTotal !== null ||
        questionsTotal !== null) && <CriterionScoreRollup rollup={rollup} />}

      {chartData.length > 0 && (
        <CriterionCharts chartData={chartData} showRadar={showRadar} />
      )}

      {entries.length === 0 ? (
        <p className="text-sm italic text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.empty_states.no_detail")}
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map(({ key, score }) => (
            <CriterionRow
              key={key}
              criterionKey={key}
              score={score}
              weight={weights[key]}
              good={strengths.byCriterion.get(key) ?? []}
              bad={weaknesses.byCriterion.get(key) ?? []}
            />
          ))}
        </ul>
      )}

      {(extraStrengths.length > 0 || extraWeaknesses.length > 0) && (
        <CriterionExtraNotes
          extraStrengths={extraStrengths}
          extraWeaknesses={extraWeaknesses}
        />
      )}
    </GlassCard>
  );
}
