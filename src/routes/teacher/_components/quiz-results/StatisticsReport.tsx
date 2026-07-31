import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { fmtPercentScaled as fmtPercent } from "@/lib/format/number";
import type { StatisticsReportRead } from "@/lib/api/hooks/quizzes";

/** Color-code discrimination: green ≥0.3, amber 0.1–0.3, red <0.1, grey null. */
function discriminationClass(value: number | null): string {
  if (value === null) return "text-m3-on-surface-variant";
  if (value >= 0.3) return "text-green-700";
  if (value >= 0.1) return "text-amber-600";
  return "text-red-700";
}

/**
 * Phase 10 — Statistics report: per-question facility index (% correct) and
 * discrimination index (point-biserial correlation with total score).
 */
export function StatisticsReport({ report }: { report: StatisticsReportRead }) {
  const { t } = useTranslation();

  if (report.rows.length === 0) {
    return (
      <p className="text-sm text-m3-on-surface-variant py-8 text-center">
        {t("teacher_quiz_results.reports.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-m3-on-surface-variant">
        {t("teacher_quiz_results.reports.stats_legend")}
      </p>
      <div className="overflow-x-auto rounded-xl border border-m3-outline-variant/30">
        <table className="w-full text-sm">
          <thead className="bg-m3-surface-container-low text-m3-on-surface-variant">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">
                {t("teacher_quiz_results.reports.col_question")}
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                {t("teacher_quiz_results.reports.col_facility")}
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                {t("teacher_quiz_results.reports.col_discrimination")}
              </th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr
                key={row.question_id}
                className="border-t border-m3-outline-variant/20"
              >
                <td
                  className="px-3 py-2 max-w-md truncate"
                  title={row.prompt_text}
                >
                  {row.prompt_text}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtPercent(row.facility_index)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right tabular-nums font-semibold",
                    discriminationClass(row.discrimination_index),
                  )}
                  title={row.discrimination_note ?? undefined}
                >
                  {row.discrimination_index === null
                    ? "—"
                    : row.discrimination_index.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
