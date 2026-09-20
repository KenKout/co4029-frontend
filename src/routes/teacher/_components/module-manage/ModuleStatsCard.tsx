import { useTranslation } from "react-i18next";
import type { CourseContentModule } from "@/lib/api/types/common";
import { computeModuleStats } from "./helpers";

/**
 * Module stats grid in the settings sidebar: total / published / draft item
 * counts plus the estimated duration. Moved verbatim out of `ModuleSettings`.
 */
export function ModuleStatsCard({ module }: { module: CourseContentModule }) {
  const { t } = useTranslation();
  const { total, publishedCount, draftCount } = computeModuleStats(module);

  return (
    <div className="bg-m3-surface-container-low rounded-xl p-5 space-y-4">
      <h3 className="font-headline font-bold text-base text-m3-primary">
        {t("teacher_common.module_stats")}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t("teacher_common.total_items"), value: total },
          { label: t("teacher_common.published"), value: publishedCount },
          { label: t("teacher_common.draft"), value: draftCount },
          {
            label: t("teacher_common.estimated_minutes"),
            value: module.estimated_minutes ?? "—",
          },
        ].map(({ label, value }) => (
          <div key={label} className="bg-m3-surface rounded-xl p-3 text-center">
            <p className="text-lg font-headline font-bold text-m3-primary">
              {value}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant mt-0.5">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
