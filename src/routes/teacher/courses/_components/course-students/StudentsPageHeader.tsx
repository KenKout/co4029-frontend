import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

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
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8 pt-2">
      <div className="space-y-1">
        <span className="text-m3-secondary font-headline font-bold text-xs tracking-widest uppercase">
          Student Management
        </span>
        <h1 className="font-headline font-extrabold text-3xl lg:text-4xl text-m3-primary tracking-tight leading-tight">
          {t("teacher_common.nav_students")}
        </h1>
        <p className="text-m3-on-surface-variant text-sm">
          {students.length} enrolled &bull; {activeCount} active &bull;{" "}
          {completedCount} completed
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {atRiskCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-2.5 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4" />
            {atRiskCount} student{atRiskCount !== 1 ? "s" : ""} need attention
          </div>
        )}
      </div>
    </div>
  );
}
