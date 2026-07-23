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
    onSuccess: (_, lessonId) => {
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
    onSuccess: (_, lessonId) => {
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
