import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";

import type { RosterStudent } from "@/lib/api/types/teacher";

import { relDate } from "./helpers";
import type { RiskMeta } from "./types";

/**
 * Key metrics strip at the foot of the profile hero card — progress, risk, last
 * active and final grade. Extracted verbatim from the former 659-line
 * course-student-detail.tsx.
 */
export function StudentMetricsStrip({
  student,
  risk,
}: {
  student: RosterStudent;
  risk: RiskMeta;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-m3-outline-variant/10">
      {[
        {
          label: "Course Progress",
          value: `${Math.round(student.progress_percent)}%`,
          icon: TrendingUp,
        },
        { label: "Risk Level", value: risk.label, icon: AlertTriangle },
        {
          label: "Last Active",
          value: relDate(student.last_activity_at),
          icon: Clock,
        },
        {
          label: "Final Grade",
          value: student.final_grade ?? "—",
          icon: CheckCircle2,
        },
      ].map((m) => (
        <div key={m.label} className="text-center">
          <m.icon className="h-4 w-4 text-m3-secondary mx-auto mb-1" />
          <div className="text-xl font-headline font-black text-m3-primary">
            {m.value}
          </div>
          <div className="text-[10px] text-m3-on-surface-variant font-bold uppercase tracking-wide">
            {m.label}
          </div>
        </div>
      ))}
    </div>
  );
}
