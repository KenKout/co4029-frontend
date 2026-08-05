import { SectionHeader } from "@/components/ui/section-header";

import { ActiveFilterChips } from "./_components/course-assessments/ActiveFilterChips";
import { AssessmentFilterBar } from "./_components/course-assessments/AssessmentFilterBar";
import { AssessmentResultsPanel } from "./_components/course-assessments/AssessmentResultsPanel";
import { AssessmentSummaryTiles } from "./_components/course-assessments/AssessmentSummaryTiles";
import { AssessmentTabBar } from "./_components/course-assessments/AssessmentTabBar";
import { useCourseAssessmentsController } from "./_components/course-assessments/use-course-assessments-controller";

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
  const controller = useCourseAssessmentsController();

  return (
    <div className="min-h-screen pb-12">
      <div className="pt-2">
        <SectionHeader
          title="Assessments"
          subtitle="Every quiz attempt and interview session in this course."
        />
      </div>

      {/* ── 12-col grid: main content + sticky summary sidebar ── */}
      <div className="mt-6 grid grid-cols-12 gap-6">
        {/* ── Main 8 cols ── */}
        <div className="col-span-12 lg:col-span-8 space-y-6 min-w-0">
          <AssessmentTabBar controller={controller} />

          <AssessmentFilterBar controller={controller} />

          {controller.activeChips.length > 0 && (
            <ActiveFilterChips controller={controller} />
          )}

          <p className="text-xs text-m3-on-surface-variant">
            {controller.tab === "quizzes"
              ? `Showing ${controller.filteredQuizAttempts.length} of ${controller.quizAttempts?.length ?? 0}`
              : `Showing ${controller.filteredInterviewSessions.length} of ${controller.interviewSessions?.length ?? 0}`}
          </p>

          <AssessmentResultsPanel controller={controller} />
        </div>

        {/* ── Sidebar 4 cols ── */}
        <div className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-24 self-start">
          <AssessmentSummaryTiles
            controller={controller}
            className="lg:grid-cols-1"
          />
        </div>
      </div>
    </div>
  );
}
