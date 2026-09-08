import { AlertTriangle, Award, TrendingUp, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatCard } from "@/components/ui/stat-card";

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
  const { t } = useTranslation();
  const { students, avgProgress, atRiskCount, completedCount } = controller;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        {
          label: t("teacher_course_students.stats.total"),
          value: String(students.length),
          sub: t("teacher_course_students.stats.enrolled"),
          icon: Users,
          cls: "",
        },
        {
          label: t("teacher_course_students.stats.avg_progress"),
          value: `${avgProgress}%`,
          sub: t("teacher_course_students.stats.cohort_avg"),
          icon: TrendingUp,
          cls: "",
        },
        {
          label: t("teacher_course_students.stats.overall_risk"),
          value: String(atRiskCount),
          sub: t("teacher_course_students.stats.need_attention"),
          icon: AlertTriangle,
          cls: atRiskCount > 0 ? "border-amber-200" : "",
        },
        {
          label: t("teacher_course_students.stats.completed"),
          value: String(completedCount),
          sub: t("teacher_course_students.stats.finished"),
          icon: Award,
          cls: "",
        },
      ].map((s) => (
        <StatCard
          key={s.label}
          label={s.label}
          value={s.value}
          sublabel={s.sub}
          icon={s.icon}
          className={`p-4 ${s.cls}`}
        />
      ))}
    </div>
  );
}
