import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useQuizGradebook } from "@/lib/api/hooks/quizzes";

/**
 * Phase 9 — gradebook tab. Read-only view of each student's materialised
 * grade-of-record (computed from their attempts via the quiz's grading_method).
 */
export function GradebookTab({ quizId }: { quizId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuizGradebook(quizId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-m3-on-surface-variant py-8 text-center">
        {t("teacher_quiz_results.gradebook.empty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-m3-outline-variant/30">
      <table className="w-full text-sm">
        <thead className="bg-m3-surface-container-low text-m3-on-surface-variant">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">
              {t("teacher_quiz_results.gradebook.col_student")}
            </th>
            <th className="px-3 py-2 text-right font-semibold">
              {t("teacher_quiz_results.gradebook.col_grade")}
            </th>
            <th className="px-3 py-2 text-center font-semibold">
              {t("teacher_quiz_results.gradebook.col_passed")}
            </th>
            <th className="px-3 py-2 text-left font-semibold">
              {t("teacher_quiz_results.gradebook.col_method")}
            </th>
            <th className="px-3 py-2 text-right font-semibold">
              {t("teacher_quiz_results.gradebook.col_attempts")}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.student_id}
              className="border-t border-m3-outline-variant/20"
            >
              <td className="px-3 py-2 font-mono text-xs text-m3-on-surface-variant">
                {row.student_id}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold">
                {Number(row.grade_percent).toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-center">
                <span
                  className={cn(
                    "inline-flex px-2 py-0.5 rounded-full text-xs font-semibold",
                    row.passed
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700",
                  )}
                >
                  {row.passed
                    ? t("teacher_quiz_results.gradebook.passed")
                    : t("teacher_quiz_results.gradebook.failed")}
                </span>
              </td>
              <td className="px-3 py-2 text-m3-on-surface-variant">
                {row.grading_method}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {row.attempts_counted}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
