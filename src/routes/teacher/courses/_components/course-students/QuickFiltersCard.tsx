import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { QUICK_FILTERS } from "./constants";
import type { CourseStudentsController } from "./use-course-students-controller";

/**
 * Sidebar "Quick Filters" card — one shortcut button per status bucket,
 * extracted verbatim from the former 658-line course-students.tsx. The button
 * list moved to `constants.ts` because it is static.
 */
export function QuickFiltersCard({
  controller,
}: {
  controller: CourseStudentsController;
}) {
  const { setStatusFilter } = controller;
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-2">
      <h3 className="font-headline font-bold text-m3-primary text-base mb-4">
        Quick Filters
      </h3>
      {QUICK_FILTERS.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => setStatusFilter(a.filter)}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-m3-surface-container-low transition-colors group text-left cursor-pointer"
        >
          <div className={cn("p-2 rounded-lg", a.bg)}>
            <a.icon className={cn("h-4 w-4", a.color)} />
          </div>
          <span className="text-sm font-medium text-m3-on-surface flex-1">
            {a.label}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-m3-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
    </div>
  );
}
