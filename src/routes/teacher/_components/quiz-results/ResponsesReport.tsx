import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ResponsesReportRead } from "@/lib/api/hooks/quizzes";

/**
 * Phase 10 — Responses report: one row per (student, question) showing what the
 * student answered vs the correct answer. Teacher-only (is_correct is expected
 * here, unlike the learner surface).
 */
export function ResponsesReport({ report }: { report: ResponsesReportRead }) {
  const { t } = useTranslation();

  if (report.rows.length === 0) {
    return (
      <p className="text-sm text-m3-on-surface-variant py-8 text-center">
        {t("teacher_quiz_results.reports.empty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-m3-outline-variant/30">
      <table className="w-full text-sm">
        <thead className="bg-m3-surface-container-low text-m3-on-surface-variant">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">
              {t("teacher_quiz_results.reports.col_question")}
            </th>
            <th className="px-3 py-2 text-left font-semibold">
              {t("teacher_quiz_results.reports.col_student_answer")}
            </th>
            <th className="px-3 py-2 text-left font-semibold">
              {t("teacher_quiz_results.reports.col_correct_answer")}
            </th>
            <th className="px-3 py-2 text-center font-semibold">
              {t("teacher_quiz_results.reports.col_result")}
            </th>
            <th className="px-3 py-2 text-right font-semibold">
              {t("teacher_quiz_results.reports.col_points")}
            </th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row, i) => (
            <tr
              key={`${row.attempt_id}-${row.question_id}-${i}`}
              className="border-t border-m3-outline-variant/20"
            >
              <td className="px-3 py-2 max-w-xs truncate" title={row.prompt_text}>
                {row.prompt_text}
              </td>
              <td className="px-3 py-2 max-w-xs truncate" title={row.student_answer}>
                {row.student_answer || "—"}
              </td>
              <td className="px-3 py-2 max-w-xs truncate" title={row.correct_answer}>
                {row.correct_answer || "—"}
              </td>
              <td className="px-3 py-2 text-center">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full",
                    row.is_correct
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700",
                  )}
                >
                  {row.is_correct ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {Number(row.points_awarded).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
