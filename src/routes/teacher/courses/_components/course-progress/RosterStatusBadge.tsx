import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, PlayCircle } from "lucide-react";

/**
 * The roster row's status pill — completed / at risk / in progress / not
 * started, in that precedence. Extracted verbatim from the former 401-line
 * course-progress.tsx.
 */
export function RosterStatusBadge({
  isComplete,
  isAtRisk,
  isStarted,
}: {
  isComplete: boolean;
  isAtRisk: boolean;
  isStarted: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end">
      {isComplete ? (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
          <CheckCircle2 className="h-3 w-3" />
          {t("teacher_progress.status.completed")}
        </span>
      ) : isAtRisk ? (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
          <AlertTriangle className="h-3 w-3" />
          {t("teacher_progress.status.at_risk")}
        </span>
      ) : isStarted ? (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-m3-primary bg-m3-primary-fixed px-2 py-1 rounded-full">
          <PlayCircle className="h-3 w-3" />
          {t("teacher_progress.status.in_progress")}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-m3-on-surface-variant bg-m3-surface-container px-2 py-1 rounded-full">
          {t("teacher_progress.status.not_started")}
        </span>
      )}
    </div>
  );
}
