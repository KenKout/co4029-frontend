import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/ui/page-header";
import { useCourseHealth } from "@/lib/api/hooks/teacher-courses";

import { CourseHealthSection } from "./_components/teacher-index/CourseHealthSection";

/**
 * The full Course Health table, on its own page.
 *
 * It used to sit at the bottom of the dashboard, which made the dashboard
 * a data grid that happened to have a work queue above it. Ranking a whole
 * teaching load is a deliberate task, not something a teacher does while
 * triaging — so it gets a page, and the dashboard rail keeps the three or
 * four worst courses plus a link here.
 *
 * Same query as the rail, so the two cannot disagree about which course is
 * worst; this one just renders every row and every column.
 */
export default function TeacherCourseHealthPage() {
  const { t } = useTranslation();
  const { data: rows = [], isLoading } = useCourseHealth();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
      <PageHeader
        title={t("teacher_dashboard.health.title")}
        subtitle={t("teacher_dashboard.health.subtitle")}
      />

      <Link
        to="/teacher"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-m3-primary hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {t("teacher_dashboard.health.back_to_workspace")}
      </Link>

      <CourseHealthSection rows={rows} isLoading={isLoading} t={t} />
    </div>
  );
}
