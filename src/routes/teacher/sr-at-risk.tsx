import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DataTable } from "@/components/ui/data-table";
import { SectionHeader } from "@/components/ui/section-header";
import { useCourse } from "@/lib/api/hooks/courses";
import { useAtRiskStudents } from "@/lib/api/hooks/spaced-repetition";
import { useRelDate } from "@/lib/format/date";

import { buildAtRiskColumns } from "./_components/sr-at-risk/at-risk-columns";
import {
  AtRiskEmptyState,
  AtRiskRowActions,
} from "./_components/sr-at-risk/AtRiskTableChrome";
import { SR_DETAIL_TO } from "./_components/sr-at-risk/constants";
import { FlagSummaryCards } from "./_components/sr-at-risk/FlagSummaryCards";
import { flagCountOf } from "./_components/sr-at-risk/helpers";

/**
 * At-risk roster for one course: per-flag tiles plus a priority-sorted table.
 *
 * Flag metadata, the chips, the table columns and the row actions live in
 * `./_components/sr-at-risk/`; this file is the composition shell.
 */
export default function TeacherSrAtRiskPage() {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const navigate = useNavigate();
  const relDate = useRelDate();
  const { data: course } = useCourse(courseId);
  const { data: students, isLoading } = useAtRiskStudents(courseId);

  // Sort most-urgent first: more issues = higher up. Teachers scan top-down,
  // so the students needing attention now surface immediately (the raw query
  // orders alphabetically, which buries the worst cases).
  const atRiskList = [...(students ?? [])].sort(
    (a, b) => flagCountOf(b) - flagCountOf(a),
  );

  const goToDetail = (studentId: string) =>
    void navigate({ to: SR_DETAIL_TO, params: { courseId, studentId } });

  const columns = buildAtRiskColumns({ courseId, t, relDate });

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
            { label: t("teacher_sr_at_risk.breadcrumb_at_risk") },
          ]}
        />

        <div className="flex items-center gap-3">
          <Link
            to="/teacher/courses/$courseId"
            params={{ courseId }}
            className="p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-colors cursor-pointer"
            aria-label={t("teacher_sr_cohort.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <SectionHeader
            title={t("teacher_sr_at_risk.title")}
            subtitle={t("teacher_sr_at_risk.subtitle")}
          />
        </div>

        <FlagSummaryCards students={atRiskList} isLoading={isLoading} t={t} />

        <DataTable
          columns={columns}
          data={atRiskList}
          getRowId={(s) => s.student_id}
          loading={isLoading}
          onRowClick={(s) => goToDetail(s.student_id)}
          pagination
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={<AtRiskEmptyState t={t} />}
          actions={(s) => (
            <AtRiskRowActions student={s} onViewDetail={goToDetail} t={t} />
          )}
        />
      </div>
    </div>
  );
}
