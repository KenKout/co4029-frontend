import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/ui/page-header";
import {
  useCourseHealth,
  usePriorityTasks,
  useStudentsNeedingAttention,
  useTeacherDashboardStats,
} from "@/lib/api/hooks/teacher-courses";

import { buildReviewCandidates } from "./_components/teacher-index/helpers";
import { AtAGlance } from "./_components/teacher-index/rail/AtAGlance";
import { CourseHealthRail } from "./_components/teacher-index/rail/CourseHealthRail";
import { WorkQueueSection } from "./_components/teacher-index/work-queue/WorkQueueSection";

/**
 * Teacher workspace.
 *
 * Two columns, not a scroll of stacked sections. The previous layout was a
 * document — four full-width bands read top to bottom — and it had two
 * problems that were really the same problem.
 *
 * It rendered its content twice. Priority Today is derived from the risk
 * rows and review counts that the two sections beneath it also rendered, so
 * on a populated dashboard most of the page was a second printing of its
 * own top. Merging those three into one tabbed queue removed the
 * duplication and roughly halved the scroll.
 *
 * And with no `max-width`, every section was a 1300px band holding one line
 * of text at desktop widths — worst on an empty dashboard, where three
 * consecutive "nothing to do" cards read as broken rather than as good
 * news. The queue is now bounded, and the rail beside it always carries the
 * course list and the context numbers, so the page is never blank.
 *
 * Each block owns its query, so a slow or failing one degrades to its own
 * skeleton or empty state instead of blocking the shell.
 */
export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { data: stats } = useTeacherDashboardStats();
  const { data: priority = [], isLoading: priorityLoading } = usePriorityTasks();
  const { data: atRisk = [], isLoading: atRiskLoading } =
    useStudentsNeedingAttention();
  const { data: courseHealth = [], isLoading: healthLoading } =
    useCourseHealth();

  const reviewItems = buildReviewCandidates(stats, t).filter((i) => i.count > 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
      {/* No subtitle: "Manage your courses, materials, and AI generation"
          restated the navigation and pushed the queue below the fold. */}
      <PageHeader title={t("teacher_dashboard.title")} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <WorkQueueSection
          tasks={priority}
          tasksLoading={priorityLoading}
          students={atRisk}
          studentsLoading={atRiskLoading}
          reviewItems={reviewItems}
          t={t}
        />

        {/* The rail is context, not work: the numbers the queue cannot
            carry, and the shortest possible answer to "which course needs
            me". It renders even when the queue is empty, which is what
            stops an all-clear dashboard looking like a failed load. */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <CourseHealthRail
            rows={courseHealth}
            isLoading={healthLoading}
            t={t}
          />
          <AtAGlance stats={stats} t={t} />
        </aside>
      </div>
    </div>
  );
}
