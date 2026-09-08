import { SectionHeader } from "@/components/ui/section-header";
import { useTranslation } from "react-i18next";

import { ActiveFilterChips } from "./_components/course-assessments/ActiveFilterChips";
import { AssessmentFilterBar } from "./_components/course-assessments/AssessmentFilterBar";
import { AssessmentResultsPanel } from "./_components/course-assessments/AssessmentResultsPanel";
import { AssessmentSummaryTiles } from "./_components/course-assessments/AssessmentSummaryTiles";
import { AssessmentTabBar } from "./_components/course-assessments/AssessmentTabBar";
import { useCourseAssessmentsController } from "./_components/course-assessments/use-course-assessments-controller";
import { CourseTabPanel } from "./_components/CourseTabPanel";

/** Course-wide "Assessments" tab: every quiz attempt + interview session
 * across the whole course, in one place. Sibling to Progress / Students /
 * Retention — filterable by student name (student-dashboard brainstorm,
 * 2026-07-11). Row click drills into the quiz-manage page (quizzes) or the
 * gap-report page (interviews), same targets as the per-student profile.
 *
 * Thin orchestrator: state and derived values live in
 * `useCourseAssessmentsController`, every piece of the surface in
 * `_components/course-assessments/`.
 */
export default function CourseAssessmentsPage() {
  const { t } = useTranslation();
  const controller = useCourseAssessmentsController();

  return (
    <CourseTabPanel>
      <div>
        <SectionHeader
          title={t("teacher_common.nav_assessments")}
          subtitle={t("teacher_assessments.subtitle")}
        />
      </div>

      <AssessmentSummaryTiles controller={controller} />

      <div className="space-y-6 min-w-0">
        <AssessmentTabBar controller={controller} />

        <AssessmentFilterBar controller={controller} />

        {controller.activeChips.length > 0 && (
          <ActiveFilterChips controller={controller} />
        )}

        <p className="text-xs text-m3-on-surface-variant">
          {t("teacher_assessments.showing", {
            shown:
              controller.tab === "quizzes"
                ? controller.filteredQuizAttempts.length
                : controller.filteredInterviewSessions.length,
            total:
              controller.tab === "quizzes"
                ? (controller.quizAttempts?.length ?? 0)
                : (controller.interviewSessions?.length ?? 0),
          })}
        </p>

        <AssessmentResultsPanel controller={controller} />
      </div>
    </CourseTabPanel>
  );
}
