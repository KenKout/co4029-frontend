import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useCareerPath,
  useCareerPathDetail,
  useCareerPathProgress,
  useMyCareerEnrollments,
} from "@/lib/api/hooks/career-paths";
import { useMyLearningPrograms } from "@/lib/api/hooks/learning-programs";
import type {
  CareerPathPublic,
  LearningProgramEnrollment,
  MyCareerEnrollmentRead,
} from "@/lib/api/types";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChoosePathBanner } from "./_components/career-path-detail/ChoosePathBanner";
import { CareerPathCourseList } from "./_components/career-path-detail/CourseList";
import { CareerPathHeader } from "./_components/career-path-detail/PathHeader";
import {
  CareerPathPreparedNotice,
  CareerPathProgressCard,
} from "./_components/career-path-detail/ProgressPanels";
import { StageRoadmap } from "./_components/career-path-detail/StageRoadmap";
import { StageStepper } from "./_components/career-path-detail/StageStepper";
import {
  CareerPathErrorState,
  CareerPathLoadingState,
} from "./_components/career-path-detail/States";

function ProgramContextError({ retry }: { retry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl py-16">
      <EmptyState
        icon={ShieldAlert}
        title={t("career_path_detail.program_context.unavailable_title")}
        description={t("career_path_detail.program_context.unavailable_body")}
        cta={
          retry ? (
            <Button variant="outline" onClick={retry}>
              {t("career_path_detail.program_context.retry")}
            </Button>
          ) : (
            <Link to="/me/learning-programs">
              <Button variant="outline">
                {t("career_path_detail.program_context.back_to_programs")}
              </Button>
            </Link>
          )
        }
      />
    </div>
  );
}

export default function CareerPathDetailPage() {
  const { slug } = useParams({ strict: false });
  const search = useSearch({ strict: false });
  const programEnrollmentId = search.enrollment;
  const path = useCareerPath(slug);
  const programs = useMyLearningPrograms();
  const program = useMemo(
    () =>
      programEnrollmentId
        ? programs.data?.find((item) => item.id === programEnrollmentId)
        : undefined,
    [programEnrollmentId, programs.data],
  );
  if (path.isLoading) {
    return <CareerPathLoadingState />;
  }

  if (programEnrollmentId && programs.isLoading) {
    return <CareerPathLoadingState />;
  }

  if (programEnrollmentId && programs.isError) {
    return <ProgramContextError retry={() => void programs.refetch()} />;
  }

  if (programEnrollmentId && !program) {
    return <ProgramContextError />;
  }

  if (path.isError || !path.data) {
    return <CareerPathErrorState />;
  }

  if (
    program &&
    !program.paths.some(
      (item) =>
        item.career_path_id === path.data.id && item.status !== "archived",
    )
  ) {
    return <ProgramContextError />;
  }

  return (
    <CareerPathDetailContent
      data={path.data}
      program={program}
      programEnrollmentId={programEnrollmentId}
    />
  );
}

function isEnrolledInPath(
  pathId: string,
  program: LearningProgramEnrollment | undefined,
  enrollments: MyCareerEnrollmentRead[],
) {
  if (program) {
    return program.attempts.some(
      (attempt) =>
        attempt.status === "active" && attempt.career_path_id === pathId,
    );
  }
  return enrollments.some(
    (enrollment) =>
      enrollment.status === "active" && enrollment.career_path_id === pathId,
  );
}

function CareerPathDetailContent({
  data,
  program,
  programEnrollmentId,
}: {
  data: CareerPathPublic;
  program?: LearningProgramEnrollment;
  programEnrollmentId?: string;
}) {
  const enrollments = useMyCareerEnrollments();
  const enrolled = useMemo(
    () => isEnrolledInPath(data.id, program, enrollments.data ?? []),
    [data.id, enrollments.data, program],
  );
  const progress = useCareerPathProgress(enrolled ? data.id : undefined);
  // Structure-only stages let a prospective student inspect the roadmap.
  const detail = useCareerPathDetail(!enrolled ? data.slug : undefined);
  const progressByCourseId = new Map(
    (progress.data?.courses ?? []).map((c) => [c.course_id, c]),
  );
  const courseMeta = new Map(data.courses.map((c) => [c.course_id, c]));
  const stages = progress.data?.stages ?? [];
  const roadmapStages = detail.data?.stages ?? [];
  const firstIncomplete = data.courses.find((c) => {
    const p = progressByCourseId.get(c.course_id);
    return !p || p.completion_percent < 100;
  });

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8">
      <CareerPathHeader
        data={data}
        enrolled={enrolled}
        progress={progress.data}
        program={program}
        programEnrollmentId={programEnrollmentId}
      />

      <CareerPathProgressCard
        enrolled={enrolled}
        progress={progress.data}
        firstIncomplete={firstIncomplete}
      />

      <CareerPathPreparedNotice enrolled={enrolled} progress={progress.data} />

      {/* Only renders when a program enrolment is awaiting a choice that
          includes this path — invisible for ordinary catalog browsing. */}
      <ChoosePathBanner
        careerPathId={data.id}
        careerPathSlug={data.slug}
        programEnrollmentId={programEnrollmentId}
      />

      {enrolled && stages.length > 0 ? (
        <StageStepper
          careerPathId={data.id}
          stages={stages}
          courseMeta={courseMeta}
          overConcurrencyCap={progress.data?.over_concurrency_cap}
          activeInPath={progress.data?.active_in_path}
        />
      ) : roadmapStages.length > 0 ? (
        // Not enrolled, but the path HAS stages: show the roadmap so the
        // shape of the commitment is visible before making it. This used to
        // fall straight through to the flat list.
        <StageRoadmap stages={roadmapStages} />
      ) : (
        // Paths authored before stages existed have no stage rows at all —
        // the flat list stays the honest rendering for those.
        <CareerPathCourseList
          courses={data.courses}
          progressByCourseId={progressByCourseId}
        />
      )}
    </div>
  );
}
