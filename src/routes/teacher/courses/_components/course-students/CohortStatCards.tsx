import { AlertTriangle, Award, TrendingUp, Users } from "lucide-react";

import { cn } from "@/lib/utils";

import type { CourseStudentsController } from "./use-course-students-controller";

/**
 * The four cohort stat cards above the roster table (Total / Avg Progress /
 * At Risk / Completed), extracted verbatim from the former 658-line
 * course-students.tsx. The card list stays an inline array because every value
 * is derived per render.
 */
export function CohortStatCards({
  controller,
}: {
  controller: CourseStudentsController;
}) {
  const { students, avgProgress, atRiskCount, completedCount } = controller;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        {
          label: "Total",
          value: String(students.length),
          sub: "Enrolled",
          icon: Users,
          cls: "",
        },
        {
          label: "Avg Progress",
          value: `${avgProgress}%`,
          sub: "Cohort avg",
          icon: TrendingUp,
          cls: "",
        },
        {
          label: "At Risk",
          value: String(atRiskCount),
          sub: "Need attention",
          icon: AlertTriangle,
          cls: atRiskCount > 0 ? "border-amber-200" : "",
        },
        {
          label: "Completed",
          value: String(completedCount),
          sub: "Finished",
          icon: Award,
          cls: "",
        },
      ].map((s) => (
        <div
          key={s.label}
          className={cn(
            "bg-m3-surface-container-lowest rounded-xl p-4 ghost-border shadow-editorial space-y-2",
            s.cls,
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {s.label}
            </span>
            <s.icon className="h-4 w-4 text-m3-secondary" />
          </div>
          <div className="text-2xl font-headline font-black text-m3-primary">
            {s.value}
          </div>
          <div className="text-xs text-m3-on-surface-variant">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
