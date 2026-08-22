import { useTranslation } from "react-i18next";
import type { PathReadinessOverview } from "@/lib/api/types";

/** Aggregate readiness figure for the enrolled cohort (FR-6.8). */
export function ReadinessSnapshot({ data }: { data: PathReadinessOverview }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-5 flex flex-wrap items-center gap-x-8 gap-y-2">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("management_career_path_detail.sections.readiness_snapshot")}
        </p>
        <p className="text-2xl font-headline font-bold text-m3-on-surface">
          {data.average_score?.toFixed(1) ?? "—"}%
        </p>
      </div>
      <p className="text-sm text-m3-on-surface-variant">
        {t("management_career_path_detail.readiness_students_counted", {
          count: data.student_count,
        })}
      </p>
    </div>
  );
}
