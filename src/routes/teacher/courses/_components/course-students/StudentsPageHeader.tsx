import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

import { SectionHeader } from "@/components/ui/section-header";

import type { CourseStudentsController } from "./use-course-students-controller";

/**
 * Page header of the course Students tab — eyebrow, title, the
 * enrolled/active/completed line and the "needs attention" pill. Extracted
 * verbatim from the former 658-line course-students.tsx. The course title and
 * the tabs live in the shell above this.
 */
export function StudentsPageHeader({
  controller,
}: {
  controller: CourseStudentsController;
}) {
  const { t } = useTranslation();
  const { students, activeCount, completedCount, atRiskCount } = controller;
  return (
    <SectionHeader
      title={t("teacher_common.nav_students")}
      subtitle={t("teacher_course_students.summary", {
        enrolled: students.length,
        active: activeCount,
        completed: completedCount,
      })}
      action={
        atRiskCount > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            {t("teacher_course_students.overall_risk_count", {
              count: atRiskCount,
            })}
          </div>
        ) : null
      }
    />
  );
}
