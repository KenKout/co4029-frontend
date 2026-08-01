import type { CourseContentModule } from "@/lib/api/types/common";
import { computeModuleStats } from "./helpers";

/**
 * Module stats grid in the settings sidebar: total / published / draft item
 * counts plus the estimated duration. Moved verbatim out of `ModuleSettings`.
 */
export function ModuleStatsCard({ module }: { module: CourseContentModule }) {
  const { total, publishedCount, draftCount } = computeModuleStats(module);

  return (
    <div className="bg-m3-surface-container-low rounded-xl p-5 space-y-4">
      <h3 className="font-headline font-bold text-base text-m3-primary">
        Module Stats
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Items", value: total },
          { label: "Published", value: publishedCount },
          { label: "Draft", value: draftCount },
          { label: "Est. Minutes", value: module.estimated_minutes ?? "—" },
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
