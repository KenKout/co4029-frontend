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
  CareerPathEnrollmentNotice,
  CareerPathPreparedNotice,
  CareerPathProgressCard,
} from "./_components/career-path-detail/ProgressPanels";
import {
  CareerPathErrorState,
  CareerPathLoadingState,
} from "./_components/career-path-detail/States";
import { StageStepper } from "./_components/career-path-detail/StageStepper";

export default function CareerPathDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const path = useCareerPath(slug);
  const enrollments = useMyCareerEnrollments();
  const enrolled = useMemo(
    () =>
      (enrollments.data ?? []).some(
        (e) => path.data && e.career_path_id === path.data.id,
      ),
    [enrollments.data, path.data],
  );
  const progress = useCareerPathProgress(
    enrolled && path.data ? path.data.id : undefined,
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

      <CareerPathEnrollmentNotice enrolled={enrolled} />

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
      ) : (
        <CareerPathCourseList
          courses={data.courses}
          progressByCourseId={progressByCourseId}
        />
      )}
    </div>
  );
}
