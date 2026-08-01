import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { AtRiskRow } from "./AtRiskRow";
import type { CourseProgressController } from "./use-course-progress-controller";

/**
 * At-risk panel — header with the live count pill, then the skeleton, the
 * all-clear empty state or the row list. Extracted verbatim from the former
 * 401-line course-progress.tsx, branch nesting included.
 */
export function AtRiskPanel({
  controller,
}: {
  controller: CourseProgressController;
}) {
  const { t } = useTranslation();
  const { atRisk, atRiskLoading, courseId, studentNames } = controller;
  return (
    <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-m3-outline-variant/20">
        <div>
          <h2 className="font-headline font-bold text-base text-m3-on-surface flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            {t("teacher_progress.at_risk_title")}
          </h2>
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            {t("teacher_progress.at_risk_subtitle")}
          </p>
        </div>
        <span
          className={cn(
            "text-xs font-bold px-3 py-1 rounded-full",
            (atRisk?.students.length ?? 0) > 0
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-50 text-emerald-700",
          )}
        >
          {atRiskLoading
            ? "…"
            : t("teacher_progress.at_risk_count", {
                count: atRisk?.students.length ?? 0,
              })}
        </span>
      </div>

      {atRiskLoading ? (
        <div className="p-5 space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-m3-surface-container-low animate-pulse"
            />
          ))}
        </div>
      ) : !atRisk?.students.length ? (
        <div className="px-6 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-m3-on-surface">
            {t("teacher_progress.at_risk_empty_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant mt-1">
            {t("teacher_progress.at_risk_empty_body")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-m3-outline-variant/10">
          {atRisk.students.map((s) => (
            <AtRiskRow
              key={s.user_id}
              student={s}
              courseId={courseId}
              studentNames={studentNames}
            />
          ))}
        </div>
      )}
    </section>
  );
}
