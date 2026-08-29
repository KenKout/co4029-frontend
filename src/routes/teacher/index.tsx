import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/ui/page-header";
import {
  useCourseHealth,
  usePriorityTasks,
  useStudentsNeedingAttention,
  useTeacherDashboardStats,
} from "@/lib/api/hooks/teacher-courses";

import { CourseHealthSection } from "./_components/teacher-index/CourseHealthSection";
import { DashboardSignals } from "./_components/teacher-index/DashboardSignals";
import { buildReviewCandidates } from "./_components/teacher-index/helpers";
import { PriorityTodaySection } from "./_components/teacher-index/PriorityTodaySection";
import { ReviewQueueSection } from "./_components/teacher-index/ReviewQueueSection";
import { StudentsNeedingAttentionSection } from "./_components/teacher-index/StudentsNeedingAttentionSection";

/**
 * Teacher landing page.
 *
 * Ordered by what a teacher can act on, not by what is easiest to
 * aggregate. The page used to open with four static tiles and a gallery of
 * course thumbnails, which meant the most urgent thing on the page — a
 * student who had gone quiet — was reliably below the fold.
 *
 * Now: what to do next, who needs help, what content is waiting, how the
 * courses compare, and only then the trend numbers. The signal tiles moved
 * to the bottom deliberately; they are context for a decision, not the
 * decision itself.
 *
 * Each section owns its own query, so a slow or failing one degrades to
 * its own skeleton or empty state instead of blocking the shell.
 */
export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { data: stats } = useTeacherDashboardStats();
  const { data: priority = [], isLoading: priorityLoading } = usePriorityTasks();
  const { data: atRisk = [], isLoading: atRiskLoading } =
    useStudentsNeedingAttention();
  const { data: courseHealth = [], isLoading: healthLoading } = useCourseHealth();

  const reviewItems = buildReviewCandidates(stats, t).filter((i) => i.count > 0);

  return (
    <div className="space-y-8 pb-12">
      {/* No subtitle: "Manage your courses, materials, and AI generation"
          restated the navigation and pushed the signals below the fold. */}
      <PageHeader title={t("teacher_dashboard.title")} />

      <PriorityTodaySection
        tasks={priority}
        isLoading={priorityLoading}
        t={t}
      />

      {/* People before content: a student falling behind decays while a
          review backlog merely waits. */}
      <StudentsNeedingAttentionSection
        students={atRisk}
        isLoading={atRiskLoading}
        t={t}
      />

      {/* The full review queue. Priority Today surfaces at most one row per
          category with its age and blocking count; this is where a teacher
          goes to work through them. */}
      <ReviewQueueSection reviewItems={reviewItems} t={t} />

      {/* Course Health replaces the course gallery: the gallery gave every
          course equal visual weight and shrank the signals into badges, so
          it could not answer "which of my courses needs me today". */}
      <CourseHealthSection rows={courseHealth} isLoading={healthLoading} t={t} />

      {/* Trend context, last. These numbers explain the sections above
          without repeating them (see DashboardSignals); none of them is an
          action on its own. */}
      <DashboardSignals stats={stats} t={t} />
    </div>
  );
}
