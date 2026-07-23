import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost, apiPut } from "../client";
import { authenticatedFetch } from "../../auth";
import { queryKeys } from "../query-keys";
import type {
  CourseAuthoring,
  CourseCreate,
  CourseUpdate,
  LessonAuthoring,
  LessonCreate,
  LessonResourceAuthoring,
  LessonResourceCreate,
  LessonUpdate,
  ModuleAuthoring,
  ModuleCreate,
  ModuleItemAuthoring,
  ModuleUpdate,
} from "../types";
import type {
  Course,
  CourseContent,
  CourseDetail,
  LessonResource,
  StreamUrlResponse,
} from "../types/common";
import type {
  CourseRoster,
  LessonOutlineRead,
  LessonRead,
} from "../types/teacher";

export function useTeacherCourses() {
  return useQuery({
    queryKey: ["teacher", "courses"],
    queryFn: () => apiFetch<Course[]>("/teacher/courses"),
    staleTime: 1000 * 60 * 2,
  });
}

export interface TeacherDashboardStats {
  draft_courses: number;
  ungraded_quizzes: number;
  pending_interviews: number;
}

// Actionable counts for the teacher dashboard's clickable widgets. Scoped
// server-side to the caller's authorable courses.
export function useTeacherDashboardStats() {
  return useQuery({
    queryKey: ["teacher", "dashboard", "stats"],
    queryFn: () =>
      apiFetch<TeacherDashboardStats>("/teacher/dashboard/stats"),
    staleTime: 1000 * 60,
  });
}

export function useTeacherCourseById(courseId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "courses", courseId],
    queryFn: () => apiFetch<CourseDetail>(`/teacher/courses/${courseId}`),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTeacherCourseContent(courseId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "courses", courseId, "content"],
    queryFn: () =>
      apiFetch<CourseContent>(`/teacher/courses/${courseId}/content`),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useTeacherLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "lessons", lessonId],
    queryFn: () => apiFetch<LessonRead>(`/teacher/lessons/${lessonId}`),
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 5,
  });
}

export type LessonOutlineSectionGrouping = "auto" | "fixed";

export interface LessonOutlineParams {
  slidesPerSection?: number;
  sectionGrouping?: LessonOutlineSectionGrouping;
}

export function useLessonOutline(
  lessonId: string | undefined,
  params: LessonOutlineParams = {},
) {
  const { slidesPerSection = 4, sectionGrouping = "auto" } = params;
  const search = new URLSearchParams({
    slides_per_section: String(slidesPerSection),
    section_grouping: sectionGrouping,
  });
  return useQuery({
    queryKey: [
      "teacher",
      "lessons",
      lessonId,
      "outline",
      sectionGrouping,
      slidesPerSection,
    ],
    queryFn: () =>
      apiFetch<LessonOutlineRead>(
        `/teacher/lessons/${lessonId}/outline?${search.toString()}`,
      ),
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTeacherLessonResources(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "lessons", lessonId, "resources"],
    queryFn: () =>
      apiFetch<LessonResource[]>(`/teacher/lessons/${lessonId}/resources`),
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTeacherCourseRoster(courseId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "courses", courseId, "roster"],
    queryFn: () =>
      apiFetch<CourseRoster>(`/teacher/courses/${courseId}/roster`),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 2,
  });
}

export async function fetchTeacherResourceDownloadUrl(
  resourceId: string,
): Promise<string> {
  const data = await apiFetch<StreamUrlResponse>(
    `/teacher/lesson-resources/${resourceId}/download-url`,
  );
  return data.stream_url;
}

// Pre-flight slug availability check for the new-course form. Enabled only
// when a non-empty slug is supplied; the caller debounces the slug value.
export function useSlugAvailability(slug: string) {
  return useQuery({
    queryKey: ["teacher", "courses", "check-slug", slug],
    queryFn: () =>
      apiFetch<{ available: boolean }>(
        `/teacher/courses/check-slug?slug=${encodeURIComponent(slug)}`,
      ),
    enabled: slug.trim().length > 0,
    staleTime: 1000 * 30,
    retry: false,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CourseCreate) =>
      apiPost<CourseAuthoring>("/teacher/courses", payload),
    onSuccess: (course) => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.list() });
      qc.invalidateQueries({ queryKey: queryKeys.courses.bySlug(course.slug) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(course.id) });
      qc.invalidateQueries({ queryKey: ["teacher", "courses"] });
    },
  });
}

export function useUpdateCourse(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CourseUpdate) =>
      apiPatch<CourseAuthoring>(`/teacher/courses/${courseId}`, payload),
    onSuccess: (course) => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.bySlug(course.slug) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.list() });
      qc.invalidateQueries({ queryKey: ["teacher", "courses"] });
      qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId] });
    },
  });
}

// Uploads the raw image bytes as the PUT body with the file's MIME type in the
// Content-Type header (the backend reads request.body(), no multipart wrapper).
export function useUploadCourseThumbnail(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<CourseAuthoring> => {
      const response = await authenticatedFetch(
        `/teacher/courses/${courseId}/thumbnail`,
        {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        },
      );
      if (!response.ok) {
        let detail = response.statusText;
        try {
          const payload: unknown = await response.json();
          if (
            payload &&
            typeof payload === "object" &&
            "detail" in payload &&
            typeof (payload as { detail: unknown }).detail === "string"
          ) {
            detail = (payload as { detail: string }).detail;
          }
        } catch {
          // keep statusText
        }
        throw new Error(detail);
      }
      return (await response.json()) as CourseAuthoring;
    },
    onSuccess: (course) => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.bySlug(course.slug) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.list() });
      qc.invalidateQueries({ queryKey: ["teacher", "courses"] });
      qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId] });
    },
  });
}

export function usePublishCourse(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<CourseAuthoring>(`/teacher/courses/${courseId}/publish`),
    onSuccess: (course) => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.bySlug(course.slug) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.list() });
      qc.invalidateQueries({ queryKey: ["teacher", "courses"] });
      qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId] });
    },
  });
}

// Soft-deletes the course (reversible tombstone on the backend). Returns 204,
// so there's no response body to parse.
export function useDeleteTeacherCourse(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete(`/teacher/courses/${courseId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.list() });
      qc.invalidateQueries({ queryKey: ["teacher", "courses"] });
      qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId] });
    },
  });
}

export function useArchiveCourse(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<CourseAuthoring>(`/teacher/courses/${courseId}/archive`),
    onSuccess: (course) => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.bySlug(course.slug) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.list() });
      qc.invalidateQueries({ queryKey: ["teacher", "courses"] });
      qc.invalidateQueries({ queryKey: ["teacher", "courses", courseId] });
    },
  });
}

type CreateModuleInput = Omit<
  ModuleCreate,
  "course_id" | "requires_all_lessons_unlocked"
> & {
  requires_all_lessons_unlocked?: boolean;
};

export function useCreateModule(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateModuleInput) =>
      apiPost<ModuleAuthoring>(`/teacher/courses/${courseId}/modules`, {
        course_id: courseId,
        requires_all_lessons_unlocked: false,
        ...payload,
      } satisfies ModuleCreate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.modules(courseId) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.content(courseId) });
      qc.invalidateQueries({
        queryKey: ["teacher", "courses", courseId, "content"],
      });
    },
  });
}

export function useUpdateModule(moduleId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ModuleUpdate) =>
      apiPatch<ModuleAuthoring>(`/teacher/modules/${moduleId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.modules(courseId) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.content(courseId) });
      qc.invalidateQueries({
        queryKey: queryKeys.courses.moduleDetail(moduleId),
      });
      qc.invalidateQueries({
        queryKey: ["teacher", "courses", courseId, "content"],
      });
    },
  });
}

/**
 * Reorder body MUST contain the FULL ordered list of `ModuleItem.id` —
 * partial reorders are rejected because the backend uses an
 * OFFSET=100_000 two-phase swap to escape the unique position constraint.
 */
export function useReorderModuleItems(moduleId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (newOrder: string[]) =>
      apiPut<ModuleItemAuthoring[]>(
        `/teacher/modules/${moduleId}/items/reorder`,
        {
          module_id: moduleId,
          new_order: newOrder,
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.courses.moduleItems(moduleId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.courses.content(courseId) });
      qc.invalidateQueries({
        queryKey: ["teacher", "courses", courseId, "content"],
      });
    },
  });
}

export function useSetModulePrerequisites(moduleId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prerequisiteModuleIds: string[]) =>
      apiPut<ModuleAuthoring>(`/teacher/modules/${moduleId}/prerequisites`, {
        module_id: moduleId,
        prerequisite_module_ids: prerequisiteModuleIds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.modules(courseId) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.content(courseId) });
      qc.invalidateQueries({
        queryKey: queryKeys.courses.moduleDetail(moduleId),
      });
      qc.invalidateQueries({
        queryKey: ["teacher", "courses", courseId, "content"],
      });
    },
  });
}

type CreateLessonInput = Omit<
  LessonCreate,
  | "module_id"
  | "lesson_type"
  | "ef_min_unlock"
  | "tau_unlock"
  | "requires_interview_pass"
> & {
  lesson_type?: LessonCreate["lesson_type"];
  ef_min_unlock?: number;
  tau_unlock?: number;
  requires_interview_pass?: boolean;
};

/**
 * List all lessons under a module for authoring — drafts INCLUDED.
 *
 * Sibling of the learner `useModuleLessons` (which filters publish-only).
 * The FR-5 quiz generation panel needs the full list when teachers are
 * building quizzes on yet-unpublished modules; learner endpoint hides
 * those.
 */
export function useAuthoringModuleLessons(moduleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.courses.moduleLessonsAuthoring(moduleId ?? ""),
    queryFn: () =>
      apiFetch<LessonAuthoring[]>(`/teacher/modules/${moduleId}/lessons`),
    enabled: !!moduleId,
  });
}

/**
 * Server atomically inserts the linking `ModuleItem` row alongside the
 * lesson — callers must NOT also POST to `/modules/{id}/items` after this
 * or they will create a duplicate item pointing at the same lesson.
 */
export function useCreateLesson(moduleId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLessonInput) =>
      apiPost<LessonAuthoring>(`/teacher/modules/${moduleId}/lessons`, {
        module_id: moduleId,
        lesson_type: "video",
        ef_min_unlock: 2,
        tau_unlock: 0.8,
        requires_interview_pass: false,
        ...payload,
      } satisfies LessonCreate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.content(courseId) });
      qc.invalidateQueries({
        queryKey: queryKeys.courses.moduleLessons(moduleId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.courses.moduleLessonsAuthoring(moduleId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.courses.moduleItems(moduleId),
      });
      qc.invalidateQueries({
        queryKey: ["teacher", "courses", courseId, "content"],
      });
    },
  });
}

export function useUpdateLesson(lessonId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LessonUpdate) =>
      apiPatch<LessonAuthoring>(`/teacher/lessons/${lessonId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.lesson(lessonId) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.content(courseId) });
      qc.invalidateQueries({
        queryKey: ["teacher", "courses", courseId, "content"],
      });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons", lessonId] });
    },
  });
}

/**
 * Backend exposes no DELETE for lessons; archive-via-status is the
 * documented soft-delete path (learner queries filter on
 * `status = 'published'`).
 */
export function useDeleteLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) =>
      apiPatch<LessonAuthoring>(`/teacher/lessons/${lessonId}`, {
        status: "archived",
      }),
    onSuccess: (_lesson, lessonId) => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.lesson(lessonId) });
      qc.invalidateQueries({ queryKey: queryKeys.courses.content(courseId) });
      qc.invalidateQueries({
        queryKey: ["teacher", "courses", courseId, "content"],
      });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons", lessonId] });
    },
  });
}

type CreateLessonResourceInput = Omit<
  LessonResourceCreate,
  "lesson_id" | "visible_to_students"
> & {
  visible_to_students?: boolean;
};

export function useCreateLessonResource(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLessonResourceInput) =>
      apiPost<LessonResourceAuthoring>(
        `/teacher/lessons/${lessonId}/resources`,
        {
          lesson_id: lessonId,
          visible_to_students: true,
          ...payload,
        } satisfies LessonResourceCreate,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.courses.lessonResources(lessonId),
      });
      qc.invalidateQueries({
        queryKey: ["teacher", "lessons", lessonId, "resources"],
      });
    },
  });
}

export function useDeleteLessonResource(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: string) =>
      apiDelete(`/teacher/lesson-resources/${resourceId}`),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.courses.lessonResources(lessonId),
      });
      qc.invalidateQueries({
        queryKey: ["teacher", "lessons", lessonId, "resources"],
      });
    },
  });
}

export function useDeleteModuleItem(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiDelete(`/teacher/module-items/${itemId}`),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["teacher", "courses", courseId, "content"],
      }),
  });
}

export function useUpdateModuleItem(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: { unlock_rule_json?: Record<string, unknown> };
    }) => apiPatch(`/teacher/module-items/${itemId}`, payload),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["teacher", "courses", courseId, "content"],
      }),
  });
}
