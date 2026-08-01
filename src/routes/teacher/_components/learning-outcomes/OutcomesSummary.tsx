import { CheckCircle2, CircleHelp, TriangleAlert } from "lucide-react";

import { Dot } from "./CoverageChip";
import type { TranslateFn } from "./types";

/** Status summary strip: outcome / assignment / coverage tallies. */
export function OutcomesSummaryStrip({
  outcomeCount,
  totalAssigned,
  uncoveredCount,
  t,
}: {
  outcomeCount: number;
  totalAssigned: number;
  uncoveredCount: number;
  t: TranslateFn;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-m3-on-surface-variant">
      <span className="inline-flex items-center gap-1 font-semibold text-m3-on-surface">
        {t("teacher_interview_config.outcomes.summary_outcomes", {
          count: outcomeCount,
        })}
      </span>
      <Dot />
      <span>
        {t("teacher_interview_config.outcomes.summary_assigned", {
          count: totalAssigned,
        })}
      </span>
      <Dot />
      {uncoveredCount > 0 ? (
        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
          {t("teacher_interview_config.outcomes.summary_uncovered", {
            count: uncoveredCount,
          })}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          {t("teacher_interview_config.outcomes.summary_all_covered")}
        </span>
      )}
      <Dot />
      <span className="inline-flex items-center gap-1">
        {t("teacher_interview_config.outcomes.required_for_publishing")}
      </span>
    </div>
  );
}

/** Coverage + pass-threshold explainer beneath the summary strip. */
export function CoverageExplainer({
  coveredCount,
  outcomeCount,
  minOutcomesToPass,
  t,
}: {
  coveredCount: number;
  outcomeCount: number;
  minOutcomesToPass: number | null | undefined;
  t: TranslateFn;
}) {
  return (
    <div className="rounded-lg border border-m3-outline-variant/20 bg-m3-surface-container-low px-3 py-2 space-y-1">
      <p className="text-[11px] text-m3-on-surface-variant">
        <span className="font-semibold text-m3-on-surface">
          {t("teacher_interview_config.outcomes.coverage_title")}
        </span>{" "}
        {t("teacher_interview_config.outcomes.coverage_summary", {
          covered: coveredCount,
          total: outcomeCount,
        })}
      </p>
      {typeof minOutcomesToPass === "number" && minOutcomesToPass > 0 && (
        <p className="text-[11px] text-m3-on-surface-variant inline-flex items-center gap-1">
          <CircleHelp className="h-3 w-3 shrink-0" aria-hidden="true" />
          {t("teacher_interview_config.outcomes.pass_threshold", {
            required: minOutcomesToPass,
            total: outcomeCount,
          })}
        </p>
      )}
    </div>
  );
}
