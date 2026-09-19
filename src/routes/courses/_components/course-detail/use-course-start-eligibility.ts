import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { useMyCareerEnrollments } from "@/lib/api/hooks/career-paths";
import { apiFetch } from "@/lib/api/client";
import type { CareerPathProgressRead } from "@/lib/api/types";
import { queryKeys } from "@/lib/api/query-keys";

export function findEligibleCoursePathId(
  courseId: string | undefined,
  activePathIds: string[],
  progressByPath: Array<CareerPathProgressRead | undefined>,
): string | undefined {
  if (!courseId) return undefined;
  for (let index = 0; index < progressByPath.length; index += 1) {
    const stages = progressByPath[index]?.stages ?? [];
    const eligible = stages.some(
      (stage) =>
        stage.courses.some((course) => course.course_id === courseId) &&
        (stage.unlocked || stage.enforcement !== "hard"),
    );
    if (eligible) return activePathIds[index];
  }
  return undefined;
}

/**
 * Resolve whether a course can be lazily started from one of the student's
 * active career paths. The backend remains authoritative when the Start POST
 * runs; this read only decides which CTA to show on the landing page.
 */
/**
 * `enrolled` is tri-state on purpose: `undefined` means the enrollment
 * lookup has not answered yet. Gating on `!enrolled` instead would treat
 * "still loading" as "not enrolled" and fire both reads for an enrolled
 * student, closing the gate only after the requests had gone out.
 */
export function useCourseStartEligibility(
  courseId: string | undefined,
  enrolled: boolean | undefined,
) {
  const wantsEligibility = Boolean(courseId) && enrolled === false;
  // An enrolled student cannot lazily start the course, so neither this nor
  // the per-path fan-out below has anything to answer.
  const enrollments = useMyCareerEnrollments({ enabled: wantsEligibility });
  const activePathIds = useMemo(
    () =>
      (enrollments.data ?? [])
        .filter((enrollment) => enrollment.status === "active")
        .map((enrollment) => enrollment.career_path_id),
    [enrollments.data],
  );
  const progressQueries = useQueries({
    queries: activePathIds.map((careerPathId) => ({
      queryKey: queryKeys.careerPaths.progress(careerPathId),
      queryFn: () =>
        apiFetch<CareerPathProgressRead>(
          `/me/career-enrollments/${careerPathId}/progress`,
        ),
      enabled: wantsEligibility,
      staleTime: 1000 * 60,
    })),
  });

  const eligiblePathId = useMemo(
    () =>
      findEligibleCoursePathId(
        courseId,
        activePathIds,
        progressQueries.map((query) => query.data),
      ),
    [activePathIds, courseId, progressQueries],
  );

  return {
    eligiblePathId,
    isLoading:
      wantsEligibility &&
      (enrollments.isLoading ||
        progressQueries.some((query) => query.isLoading)),
  };
}
