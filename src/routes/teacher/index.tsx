import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/ui/page-header";
import {
  useStudentsNeedingAttention,
  useTeacherCourses,
  useTeacherDashboardStats,
} from "@/lib/api/hooks/teacher-courses";

import { CourseListSection } from "./_components/teacher-index/CourseListSection";
import { DashboardSignals } from "./_components/teacher-index/DashboardSignals";
import {
  buildReviewCandidates,
  countCardsAwaitingReview,
} from "./_components/teacher-index/helpers";
import { ReviewQueueSection } from "./_components/teacher-index/ReviewQueueSection";
import { StudentsNeedingAttentionSection } from "./_components/teacher-index/StudentsNeedingAttentionSection";

/**
 * Teacher landing page: signal tiles, the students the risk engine
 * flagged, the Human-in-the-Loop review queue and the first six courses.
 *
 * Signal derivation and each section live in `./_components/teacher-index/`;
 * this file is the composition shell.
 */
export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { data: courses = [], isLoading } = useTeacherCourses();
  const { data: stats } = useTeacherDashboardStats();
  const { data: atRisk = [], isLoading: atRiskLoading } =
    useStudentsNeedingAttention();

  const cardsAwaitingReview = countCardsAwaitingReview(stats);
  const reviewItems = buildReviewCandidates(stats, t).filter(
    (i) => i.count > 0,
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      {/* No subtitle: "Manage your courses, materials, and AI generation"
          restated the navigation and pushed the signals below the fold. */}
      <PageHeader title={t("teacher_dashboard.title")} />

      <DashboardSignals
        stats={stats}
        cardsAwaitingReview={cardsAwaitingReview}
        t={t}
      />

      {/* People before content: a student falling behind decays while a
          review backlog merely waits, so the human queue sits first. */}
      <StudentsNeedingAttentionSection
        students={atRisk}
        isLoading={atRiskLoading}
        t={t}
      />

      {/* ---- Needs your review ------------------------------------------- */}
      <ReviewQueueSection reviewItems={reviewItems} t={t} />

      {/* Course list */}
      <CourseListSection
        courses={courses}
        isLoading={isLoading}
        stats={stats}
        t={t}
      />
    </div>
  );
}
