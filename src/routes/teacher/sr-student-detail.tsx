import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SectionHeader } from "@/components/ui/section-header";
import { useCourse } from "@/lib/api/hooks/courses";
import { useStudentSrDetail } from "@/lib/api/hooks/spaced-repetition";

import { LessonRetentionSection } from "./_components/sr-student-detail/LessonRetentionSection";
import { RecentReviewsSection } from "./_components/sr-student-detail/RecentReviewsSection";
import { useFormatRelative } from "./_components/sr-student-detail/use-format-relative";

/**
 * One student's spaced-repetition detail: per-lesson retention plus the most
 * recent review attempts.
 *
 * The status/EF metadata, both sections and the relative-time formatter live in
 * `./_components/sr-student-detail/`; this file is the composition shell.
 */
export default function TeacherSrStudentDetailPage() {
  const { t } = useTranslation();
  const formatRelative = useFormatRelative();
  const { courseId, studentId } = useParams({ strict: false }) as {
    courseId: string;
    studentId: string;
  };
  const { data: course } = useCourse(courseId);
  const { data, isLoading } = useStudentSrDetail(courseId, studentId, {
    recentReviewsLimit: 20,
  });

  const lessons = data?.lessons ?? [];
  const reviews = data?.recent_reviews ?? [];

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-5xl mx-auto pb-6 space-y-6">
        <Breadcrumbs
          items={[
            {
              label: t("teacher_sr_cohort.breadcrumb_teaching"),
              to: "/teacher/courses",
            },
            {
              label: course?.title ?? t("teacher_sr_cohort.breadcrumb_course"),
              to: "/teacher/courses/$courseId",
              params: { courseId },
            },
            {
              label: t("teacher_sr_at_risk.breadcrumb_at_risk"),
              to: "/teacher/courses/$courseId/at-risk",
              params: { courseId },
            },
            {
              label:
                data?.name ?? t("teacher_sr_student_detail.breadcrumb_detail"),
            },
          ]}
        />

        <div className="flex items-center gap-3">
          <Link
            to="/teacher/courses/$courseId/at-risk"
            params={{ courseId }}
            className="p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-colors cursor-pointer"
            aria-label={t("teacher_sr_cohort.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <SectionHeader
            title={data?.name ?? t("common.loading")}
            subtitle={t("teacher_sr_student_detail.subtitle")}
          />
        </div>

        <LessonRetentionSection lessons={lessons} isLoading={isLoading} t={t} />

        <RecentReviewsSection
          reviews={reviews}
          isLoading={isLoading}
          formatRelative={formatRelative}
          t={t}
        />
      </div>
    </div>
  );
}
