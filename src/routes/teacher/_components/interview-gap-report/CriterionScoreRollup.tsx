import { useTranslation } from "react-i18next";

import type { ScoreSummaryRollup } from "./types";

/**
 * Quantitative rollup: the numbers that contextualize the per-criterion
 * means (weighted total, outcomes met, questions answered).
 */
export function CriterionScoreRollup({
  rollup,
}: {
  rollup: ScoreSummaryRollup;
}) {
  const { t } = useTranslation();
  const { totalScore, outcomesMet, outcomesTotal, answered, questionsTotal } =
    rollup;
  return (
    <div className="grid grid-cols-3 gap-2">
      {totalScore !== null && (
        <div className="rounded-xl bg-m3-surface-container-low p-3 text-center">
          <p className="text-lg font-extrabold text-m3-primary tabular-nums">
            {Math.round(totalScore)}
            <span className="text-xs font-medium text-m3-on-surface-variant">
              /100
            </span>
          </p>
          <p className="text-[10px] uppercase tracking-wider text-m3-on-surface-variant mt-0.5">
            {t("teacher_interview_gap_report.labels.total_score")}
          </p>
        </div>
      )}
      {outcomesTotal !== null && (
        <div className="rounded-xl bg-m3-surface-container-low p-3 text-center">
          <p className="text-lg font-extrabold text-m3-on-surface tabular-nums">
            {outcomesMet ?? 0}
            <span className="text-xs font-medium text-m3-on-surface-variant">
              /{outcomesTotal}
            </span>
          </p>
          <p className="text-[10px] uppercase tracking-wider text-m3-on-surface-variant mt-0.5">
            {t("teacher_interview_gap_report.labels.outcomes_met")}
          </p>
        </div>
      )}
      {questionsTotal !== null && (
        <div className="rounded-xl bg-m3-surface-container-low p-3 text-center">
          <p className="text-lg font-extrabold text-m3-on-surface tabular-nums">
            {answered ?? 0}
            <span className="text-xs font-medium text-m3-on-surface-variant">
              /{questionsTotal}
            </span>
          </p>
          <p className="text-[10px] uppercase tracking-wider text-m3-on-surface-variant mt-0.5">
            {t("teacher_interview_gap_report.labels.answered")}
          </p>
        </div>
      )}
    </div>
  );
}
