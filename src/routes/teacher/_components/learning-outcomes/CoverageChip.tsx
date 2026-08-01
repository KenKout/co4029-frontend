import { useTranslation } from "react-i18next";
import { CheckCircle2, TriangleAlert } from "lucide-react";

import type { Coverage } from "./types";

export function CoverageChip({
  coverage,
  count,
}: {
  coverage: Coverage;
  count: number;
}) {
  const { t } = useTranslation();
  if (coverage === "covered") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        {t("teacher_interview_config.outcomes.used_by", { count })}
      </span>
    );
  }
  if (coverage === "limited") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
        <TriangleAlert className="h-3 w-3" aria-hidden="true" />
        {t("teacher_interview_config.outcomes.limited_coverage", { count })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
      <TriangleAlert className="h-3 w-3" aria-hidden="true" />
      {t("teacher_interview_config.outcomes.no_questions")}
    </span>
  );
}

export function Dot() {
  return (
    <span aria-hidden="true" className="text-m3-on-surface-variant/40">
      ·
    </span>
  );
}
