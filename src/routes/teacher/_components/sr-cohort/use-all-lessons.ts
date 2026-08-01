import { useQueries } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { useCourseModules } from "@/lib/api/hooks/courses";
import { queryKeys } from "@/lib/api/query-keys";
import type { LessonPublic, ModulePublic } from "@/lib/api/types";

import type { LessonOption } from "./types";

/**
 * Flatten every module's lessons into one position-ordered picker list.
 *
 * One query per module via `useQueries`, so the hook count stays stable as
 * modules load. Moved verbatim out of the pre-split `sr-cohort.tsx`.
 */
export function useAllLessonsForCourse(courseId: string | undefined) {
  const { data: modules, isLoading: modulesLoading } =
    useCourseModules(courseId);

  const sortedModules: ModulePublic[] = (modules ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);

  const lessonQueries = useQueries({
    queries: sortedModules.map((mod) => ({
      queryKey: queryKeys.courses.moduleLessons(mod.id),
      queryFn: () => apiFetch<LessonPublic[]>(`/modules/${mod.id}/lessons`),
    })),
  });

  const lessons: LessonOption[] = [];
  sortedModules.forEach((mod, idx) => {
    const result = lessonQueries[idx];
    if (!result?.data) return;
    for (const l of result.data) {
      lessons.push({
        lesson_id: l.id,
        lesson_title: l.title,
        module_title: mod.title,
      });
    }
  });

  const isLoading = modulesLoading || lessonQueries.some((q) => q.isLoading);

  return { lessons, isLoading };
}
