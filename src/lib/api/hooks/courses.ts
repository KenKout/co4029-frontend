import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import { useInfinitePage } from "../use-infinite-page";
import type {
  Course,
  CourseContentPublic,
  CourseLearningOutcomeAuthoring,
  CourseLearningOutcomePublic,
  CoursePublic,
  LessonPublic,
  LessonResourcePublic,
  ModuleItemPublic,
  ModulePublic,
  Page,
  ResourceDownloadUrlResponse,
  TagPublic,
} from "../types";

function buildPagedUrl(
  base: string,
  cursor: string | undefined,
  limit: number,
) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function useCourses(limit = 20) {
  return useInfinitePage<Course>({
    queryKey: queryKeys.courses.list(),
    fetch: (cursor, lim = limit) =>
      apiFetch<Page<Course>>(buildPagedUrl("/courses", cursor, lim ?? limit)),
    limit,
  });
}

export function useMyCourses(limit = 20) {
  return useInfinitePage<Course>({
    queryKey: queryKeys.courses.myList(),
    fetch: (cursor, lim = limit) =>
      apiFetch<Page<Course>>(
        buildPagedUrl("/me/courses", cursor, lim ?? limit),
      ),
    limit,
  });
}

/**
 * Load the published course catalogue for selector dialogs (career-path
 * course picker). The `/courses` endpoint has no `q=` param, so we pull a
 * generous first page and let the dialog filter client-side by title/slug.
 * `enabled` gates the fetch until the picker actually opens.
 */
export function useCourseCatalogue(enabled = true, limit = 100) {
  return useQuery({
    queryKey: queryKeys.courses.list(`catalogue-${limit}`),
    queryFn: () =>
      apiFetch<Page<Course>>(buildPagedUrl("/courses", undefined, limit)),
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCourseBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.bySlug(slug ?? ""),
    queryFn: () => apiFetch<CoursePublic>(`/courses/by-slug/${slug}`),
    enabled: !!slug,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 3;
    },
  });
}

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.detail(courseId ?? ""),
    queryFn: () => apiFetch<CoursePublic>(`/courses/${courseId}`),
    enabled: !!courseId,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 3;
    },
  });
}

export function useCourseContent(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.content(courseId ?? ""),
    queryFn: () =>
      apiFetch<CourseContentPublic>(`/courses/${courseId}/content`),
    enabled: !!courseId,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 3;
    },
  });
}

export function useCourseTags(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.tags(courseId ?? ""),
    queryFn: () => apiFetch<TagPublic[]>(`/courses/${courseId}/tags`),
    enabled: !!courseId,
  });
}

export function useCourseOutcomes(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.outcomes(courseId ?? ""),
    queryFn: async () => {
      const list = await apiFetch<CourseLearningOutcomePublic[]>(
        `/courses/${courseId}/outcomes`,
      );
      return [...list].sort((a, b) => a.position - b.position);
    },
    enabled: !!courseId,
  });
}

export function useCourseModules(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.modules(courseId ?? ""),
    queryFn: () => apiFetch<ModulePublic[]>(`/courses/${courseId}/modules`),
    enabled: !!courseId,
  });
}

export function useModule(moduleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.moduleDetail(moduleId ?? ""),
    queryFn: () => apiFetch<ModulePublic>(`/modules/${moduleId}`),
    enabled: !!moduleId,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 3;
    },
  });
}

export function useModuleItems(moduleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.moduleItems(moduleId ?? ""),
    queryFn: () => apiFetch<ModuleItemPublic[]>(`/modules/${moduleId}/items`),
    enabled: !!moduleId,
  });
}

export function useModuleLessons(moduleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.moduleLessons(moduleId ?? ""),
    queryFn: () => apiFetch<LessonPublic[]>(`/modules/${moduleId}/lessons`),
    enabled: !!moduleId,
  });
}

export function useLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.lesson(lessonId ?? ""),
    queryFn: () => apiFetch<LessonPublic>(`/lessons/${lessonId}`),
    enabled: !!lessonId,
    retry: (failureCount, error) => {
      if (
        error instanceof ApiError &&
        (error.status === 404 || error.status === 403)
      )
        return false;
      return failureCount < 3;
    },
  });
}

export function useLessonResources(lessonId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.lessonResources(lessonId ?? ""),
    queryFn: () =>
      apiFetch<LessonResourcePublic[]>(`/lessons/${lessonId}/resources`),
    enabled: !!lessonId,
  });
}

export function useResourceDownloadUrl(resourceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.resourceDownload(resourceId ?? ""),
    queryFn: () =>
      apiFetch<ResourceDownloadUrlResponse>(
        `/lesson-resources/${resourceId}/download-url`,
      ),
    enabled: !!resourceId,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 3;
    },
  });
}

export async function fetchResourceDownloadUrl(
  resourceId: string,
): Promise<string> {
  const data = await apiFetch<ResourceDownloadUrlResponse>(
    `/lesson-resources/${resourceId}/download-url`,
  );
  return data.url;
}

/* ── Teacher-side learning-outcome CRUD (§LO-1/2) ──
 * The `L.O.x` code is derived from `position` (1-based, contiguous) at
 * display time; the server renumbers on delete so positions never gap.
 */
export function useTeacherCourseOutcomes(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.teacherOutcomes(courseId ?? ""),
    queryFn: async () => {
      const list = await apiFetch<CourseLearningOutcomeAuthoring[]>(
        `/teacher/courses/${courseId}/outcomes`,
      );
      return [...list].sort((a, b) => a.position - b.position);
    },
    enabled: !!courseId,
  });
}

function useOutcomeInvalidation(courseId: string | undefined) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({
      queryKey: queryKeys.courses.teacherOutcomes(courseId ?? ""),
    });
    // The learner-facing (published) list shares the same rows.
    void qc.invalidateQueries({
      queryKey: queryKeys.courses.outcomes(courseId ?? ""),
    });
  };
}

export function useCreateCourseOutcome(courseId: string | undefined) {
  const invalidate = useOutcomeInvalidation(courseId);
  return useMutation({
    // parent_id (optional) nests the new outcome under an existing one for
    // the L.O.x.y hierarchy; omit / null for a top-level outcome.
    mutationFn: (args: string | { outcome_text: string; parent_id?: string | null }) => {
      const body =
        typeof args === "string"
          ? { outcome_text: args }
          : { outcome_text: args.outcome_text, parent_id: args.parent_id ?? null };
      return apiPost<CourseLearningOutcomeAuthoring>(
        `/teacher/courses/${courseId}/outcomes`,
        body,
      );
    },
    onSuccess: invalidate,
  });
}

export function useUpdateCourseOutcome(courseId: string | undefined) {
  const invalidate = useOutcomeInvalidation(courseId);
  return useMutation({
    // parent_id is only sent when re-parenting (move within the tree); pass
    // null to promote to top-level. Omit the key entirely to leave the
    // parent unchanged — the backend distinguishes the two via fields_set.
    mutationFn: ({
      outcomeId,
      outcome_text,
      parent_id,
    }: {
      outcomeId: string;
      outcome_text?: string;
      parent_id?: string | null;
    }) => {
      const body: Record<string, unknown> = {};
      if (outcome_text !== undefined) body.outcome_text = outcome_text;
      if (parent_id !== undefined) body.parent_id = parent_id;
      return apiPatch<CourseLearningOutcomeAuthoring>(
        `/teacher/courses/${courseId}/outcomes/${outcomeId}`,
        body,
      );
    },
    onSuccess: invalidate,
  });
}

export function useDeleteCourseOutcome(courseId: string | undefined) {
  const invalidate = useOutcomeInvalidation(courseId);
  return useMutation({
    mutationFn: (outcomeId: string) =>
      apiDelete(`/teacher/courses/${courseId}/outcomes/${outcomeId}`),
    onSuccess: invalidate,
  });
}
