import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost, ApiError } from "../client";
import { queryKeys } from "../query-keys";
import type {
  AtRiskListRead,
  LessonProgressPublic,
  MaterialEngagementCreate,
  MaterialEngagementPublic,
  MyCourseProgressSummary,
  RosterProgressRead,
} from "../types";

function retryUnless404(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status === 404) return false;
  return failureCount < 3;
}

export function useLessonProgress(lessonId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.progress.lesson(lessonId ?? ""),
    queryFn: () =>
      apiFetch<LessonProgressPublic>(`/me/progress/lessons/${lessonId}`),
    enabled: Boolean(lessonId),
    staleTime: 1000 * 30,
    retry: retryUnless404,
  });
}

export function useMyCourseProgress(courseId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.progress.myCourse(courseId ?? ""),
    queryFn: () =>
      apiFetch<MyCourseProgressSummary>(`/me/progress/courses/${courseId}`),
    enabled: Boolean(courseId),
    staleTime: 1000 * 30,
    retry: retryUnless404,
  });
}

export function useReportEngagement(opts?: {
  lessonId?: string;
  courseId?: string;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialEngagementCreate) =>
      apiPost<MaterialEngagementPublic>(
        "/me/progress/material-engagement",
        payload,
      ),
    onSuccess: () => {
      if (opts?.lessonId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.progress.lesson(opts.lessonId),
        });
      }
      if (opts?.courseId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.progress.myCourse(opts.courseId),
        });
      }
    },
  });
}

export function useMarkLessonComplete(opts?: {
  lessonId?: string;
  courseId?: string;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) =>
      apiPost<LessonProgressPublic>(
        `/me/progress/lessons/${lessonId}/complete`,
        {},
      ),
    onSuccess: (result, lessonId) => {
      // Optimistic in-place patch so the curriculum (status map) flips
      // instantly — closes the stale window while the invalidated refetch
      // lands the authoritative payload.
      patchCourseSummaryCache(
        qc,
        opts?.courseId,
        lessonId,
        result.status,
      );
      qc.setQueryData(
        queryKeys.progress.lesson(opts?.lessonId ?? lessonId),
        result,
      );
      void qc.invalidateQueries({
        queryKey: queryKeys.progress.lesson(opts?.lessonId ?? lessonId),
      });
      if (opts?.courseId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.progress.myCourse(opts.courseId),
        });
      }
    },
  });
}

export function useUnmarkLessonComplete(opts?: {
  lessonId?: string;
  courseId?: string;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) =>
      apiPost<LessonProgressPublic>(
        `/me/progress/lessons/${lessonId}/uncomplete`,
        {},
      ),
    onSuccess: (result, lessonId) => {
      patchCourseSummaryCache(
        qc,
        opts?.courseId,
        lessonId,
        result.status,
      );
      qc.setQueryData(
        queryKeys.progress.lesson(opts?.lessonId ?? lessonId),
        result,
      );
      void qc.invalidateQueries({
        queryKey: queryKeys.progress.lesson(opts?.lessonId ?? lessonId),
      });
      if (opts?.courseId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.progress.myCourse(opts.courseId),
        });
      }
    },
  });
}

/**
 * Flip one lesson's status inside the cached course summary so every
 * consumer of the status map (learn curriculum, button, course detail)
 * reflects the new state immediately. Recomputes the aggregate counters.
 */
function patchCourseSummaryCache(
  qc: ReturnType<typeof useQueryClient>,
  courseId: string | undefined,
  lessonId: string,
  status: string,
) {
  if (!courseId) return;
  qc.setQueryData<MyCourseProgressSummary>(
    queryKeys.progress.myCourse(courseId),
    (prev) => {
      if (!prev) return prev;
      const lessons = prev.lessons.map((l) =>
        l.lesson_id === lessonId ? { ...l, status } : l,
      );
      const completed = lessons.filter((l) => l.status === "completed").length;
      const inProgress = lessons.filter((l) => l.status === "in_progress").length;
      const total = prev.total_lessons || lessons.length;
      const pct =
        total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;
      return {
        ...prev,
        lessons,
        completed_lessons: completed,
        in_progress_lessons: inProgress,
        not_started_lessons: Math.max(0, total - completed - inProgress),
        // Serialized as string on the wire (backend Decimal).
        completion_percent: String(pct),
      };
    },
  );
}

export function useCohortProgress(courseId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.progress.cohort(courseId ?? ""),
    queryFn: () =>
      apiFetch<RosterProgressRead>(
        `/teacher/courses/${courseId}/progress/roster`,
      ),
    enabled: Boolean(courseId),
    staleTime: 1000 * 30,
  });
}

export function useAtRiskRoster(courseId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.progress.atRiskRoster(courseId ?? ""),
    queryFn: () =>
      apiFetch<AtRiskListRead>(`/teacher/courses/${courseId}/progress/at-risk`),
    enabled: Boolean(courseId),
    staleTime: 1000 * 30,
  });
}
