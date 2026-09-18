import { GradientProgress } from "@/components/ui/gradient-progress";
import { useTranslation } from "react-i18next";
import type { RosterStudent } from "@/lib/api/types/teacher";

/**
 * "Course Progress" section — overall completion bar plus the one-line
 * interpretation underneath. Extracted verbatim from the former 659-line
 * course-student-detail.tsx.
 */
export function StudentProgressSection({
  student,
}: {
  student: RosterStudent;
}) {
  const { t } = useTranslation();
  return (
    <section className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-5">
      <h2 className="font-headline font-bold text-lg text-m3-on-surface">
        {t("teacher_course_student_detail.course_progress")}
      </h2>

      <div className="space-y-3">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-m3-on-surface">{t("teacher_course_student_detail.overall_completion")}</span>
          <span className="font-bold text-m3-primary">
            {Math.round(student.progress_percent)}%
          </span>
        </div>
        <GradientProgress
          value={student.progress_percent}
          size="lg"
          variant={student.progress_percent >= 100 ? "success" : "primary"}
        />
        <p className="text-xs text-m3-on-surface-variant">
          {student.progress_percent === 0
            ? t("teacher_course_student_detail.progress_not_started")
            : student.progress_percent >= 100
              ? t("teacher_course_student_detail.progress_completed")
              : t("teacher_course_student_detail.progress_completed_percent", {
                  percent: Math.round(student.progress_percent),
                })}
        </p>
      </div>
    </section>
  );
}
