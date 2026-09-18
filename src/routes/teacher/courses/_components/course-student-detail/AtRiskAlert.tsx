import { AlertTriangle, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { RosterStudent } from "@/lib/api/types/teacher";

/**
 * Sidebar at-risk callout with a mailto escape hatch. Extracted verbatim from
 * the former 659-line course-student-detail.tsx; the caller still guards on the
 * medium/high risk levels, so this renders only when it should.
 */
export function AtRiskAlert({ student }: { student: RosterStudent }) {
  const { t } = useTranslation();
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-2">
      <div className="flex items-center gap-2 text-amber-700">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-bold text-sm">{t("teacher_course_student_detail.attention_needed")}</span>
      </div>
      <p className="text-xs text-amber-600 leading-relaxed">
        {student.at_risk_level === "high"
          ? t("teacher_course_student_detail.high_risk_body")
          : t("teacher_course_student_detail.medium_risk_body")}
      </p>
      <a
        href={`mailto:${student.primary_email}`}
        className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
      >
        <Mail className="h-3.5 w-3.5" />
        {t("teacher_course_student_detail.email_student", {
          name: student.display_name.split(" ")[0],
        })}
      </a>
    </div>
  );
}
