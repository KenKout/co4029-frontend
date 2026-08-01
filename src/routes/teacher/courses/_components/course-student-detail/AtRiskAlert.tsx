import { AlertTriangle, Mail } from "lucide-react";

import type { RosterStudent } from "@/lib/api/types/teacher";

/**
 * Sidebar at-risk callout with a mailto escape hatch. Extracted verbatim from
 * the former 659-line course-student-detail.tsx; the caller still guards on the
 * medium/high risk levels, so this renders only when it should.
 */
export function AtRiskAlert({ student }: { student: RosterStudent }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-2">
      <div className="flex items-center gap-2 text-amber-700">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-bold text-sm">Attention Needed</span>
      </div>
      <p className="text-xs text-amber-600 leading-relaxed">
        {student.at_risk_level === "high"
          ? "This student is at high risk of dropping out. They have low activity or falling grades."
          : "This student's activity has slowed. Consider reaching out to re-engage them."}
      </p>
      <a
        href={`mailto:${student.primary_email}`}
        className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
      >
        <Mail className="h-3.5 w-3.5" />
        Email {student.display_name.split(" ")[0]}
      </a>
    </div>
  );
}
