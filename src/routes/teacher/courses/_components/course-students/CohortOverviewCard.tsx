import { cn } from "@/lib/utils";

import type { CourseStudentsController } from "./use-course-students-controller";

/**
 * Sidebar "Cohort Overview" card — the per-risk-level breakdown bars plus the
 * Active / At Risk pair at the bottom. Extracted verbatim from the former
 * 658-line course-students.tsx.
 */
export function CohortOverviewCard({
  controller,
}: {
  controller: CourseStudentsController;
}) {
  const { riskBreakdown, activeCount, atRiskCount } = controller;
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-5">
      <h3 className="font-headline font-bold text-m3-primary text-base">
        Cohort Overview
      </h3>

      {riskBreakdown.map(({ level, meta, count, pct }) => (
        <div key={level} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} />
              <span className="font-medium text-m3-on-surface">
                {meta.label}
              </span>
            </div>
            <span className="font-bold text-m3-on-surface-variant">
              {count} <span className="font-normal opacity-60">({pct}%)</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-m3-surface-container-high overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                meta.dot,
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-m3-outline-variant/10">
        <div className="bg-m3-surface-container-low rounded-xl p-3 text-center">
          <div className="text-2xl font-headline font-black text-m3-primary">
            {activeCount}
          </div>
          <div className="text-[10px] text-m3-on-surface-variant font-bold uppercase tracking-wide mt-0.5">
            Active
          </div>
        </div>
        <div
          className={cn(
            "rounded-xl p-3 text-center",
            atRiskCount > 0 ? "bg-amber-50" : "bg-m3-surface-container-low",
          )}
        >
          <div
            className={cn(
              "text-2xl font-headline font-black",
              atRiskCount > 0 ? "text-amber-600" : "text-m3-primary",
            )}
          >
            {atRiskCount}
          </div>
          <div
            className={cn(
              "text-[10px] font-bold uppercase tracking-wide mt-0.5",
              atRiskCount > 0 ? "text-amber-600" : "text-m3-on-surface-variant",
            )}
          >
            At Risk
          </div>
        </div>
      </div>
    </div>
  );
}
