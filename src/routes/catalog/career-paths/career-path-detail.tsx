import { useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import {
  useCareerPath,
  useCareerPathProgress,
  useMyCareerEnrollments,
} from "@/lib/api/hooks/career-paths";
import { CareerPathCourseList } from "./_components/career-path-detail/CourseList";
import { CareerPathHeader } from "./_components/career-path-detail/PathHeader";
import {
  CareerPathPreparedNotice,
  CareerPathProgressCard,
} from "./_components/career-path-detail/ProgressPanels";
import {
  CareerPathErrorState,
  CareerPathLoadingState,
} from "./_components/career-path-detail/States";
import { StageStepper } from "./_components/career-path-detail/StageStepper";
import { StageRoadmap } from "./_components/career-path-detail/StageRoadmap";
import { ChoosePathBanner } from "./_components/career-path-detail/ChoosePathBanner";
import { useCareerPathDetail } from "@/lib/api/hooks/career-paths";

export default function CareerPathDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const path = useCareerPath(slug);
  const enrollments = useMyCareerEnrollments();
  const enrolled = useMemo(
    () =>
      (enrollments.data ?? []).some(
        (e) =>
          // Only an ACTIVE enrollment counts as "enrolled here": a switched-
          // away attempt leaves a dropped row behind, which must fall back to
          // the prospective-student view.
          e.status === "active" && path.data && e.career_path_id === path.data.id,
      ),
    [enrollments.data, path.data],
  );
  const progress = useCareerPathProgress(
    enrolled && path.data ? path.data.id : undefined,
  );
  // Structure-only stages, available WITHOUT an enrollment. This is what
  // lets a prospective student see the roadmap; the progress endpoint
  // above only answers for someone already enrolled.
  //
  // ⚠️ MUST stay above the early returns below — calling a hook after a
  // conditional return changes the hook count between renders and crashes
  // with React error #310 (same trap as useNavItems in interview-config).
  // The enabled flag keeps it idle until the path query settles.
  const detail = useCareerPathDetail(
    !enrolled && path.data ? path.data.slug : undefined,
  );

  if (path.isLoading) {
    return <CareerPathLoadingState />;
  }

  if (path.isError || !path.data) {
    return <CareerPathErrorState />;
  }

  const data = path.data;
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
      />

      <CareerPathProgressCard
        enrolled={enrolled}
        progress={progress.data}
        firstIncomplete={firstIncomplete}
      />

      <CareerPathPreparedNotice enrolled={enrolled} progress={progress.data} />

      {/* Only renders when a program enrolment is awaiting a choice that
          includes this path — invisible for ordinary catalog browsing. */}
      <ChoosePathBanner careerPathId={data.id} />

      {/* Enrolled students see the stage stepper (locked stages greyed, not
          hidden, with a Start button per course). Anyone browsing the
          published path without an enrollment still gets the flat course
          list — there are no stages to evaluate for them. */}
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
