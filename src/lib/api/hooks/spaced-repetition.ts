import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../client";
import { queryKeys } from "../query-keys";
import { useInfinitePage } from "../use-infinite-page";
import type {
  AtRiskStudent,
  CardDue,
  CardsDuePage,
  CohortKrResponse,
  DifficultCard,
  LessonOverviewItem,
  StudentLessonSummaryRead,
  StudentSrDetail,
} from "../types";

const STALE_60S = 60_000;
const STALE_5M = 5 * 60_000;

export type UseCardsDueOptions = {
  lessonId?: string;
  limit?: number;
  enabled?: boolean;
};

export function useCardsDue(opts: UseCardsDueOptions = {}) {
  const { lessonId, limit = 20, enabled } = opts;
  return useInfinitePage<CardDue>({
    queryKey: queryKeys.sr.cardsDue(lessonId, limit),
    fetch: async (cursor, lim = limit) => {
      const params = new URLSearchParams();
      if (lessonId) params.set("lesson_id", lessonId);
      if (cursor) params.set("cursor", cursor);
      if (lim) params.set("limit", String(lim));
      const qs = params.toString();
      const page = await apiFetch<CardsDuePage>(
        qs ? `/me/cards-due?${qs}` : "/me/cards-due",
      );
      return {
        items: page.items,
        next_cursor: page.next_cursor ?? null,
      };
    },
    limit,
    enabled,
  });
}

export function useLessonSrSummary(lessonId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sr.lessonSummary(lessonId ?? ""),
    queryFn: () =>
      apiFetch<StudentLessonSummaryRead>(
        `/me/lessons/${lessonId}/sr-summary`,
      ),
    enabled: !!lessonId,
    staleTime: STALE_5M,
  });
}

export function useCourseSrOverview(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sr.courseOverview(courseId ?? ""),
    queryFn: () =>
      apiFetch<LessonOverviewItem[]>(
        `/me/courses/${courseId}/sr-overview`,
      ),
    enabled: !!courseId,
    staleTime: STALE_60S,
  });
}

export function useCohortKr(
  courseId: string | undefined,
  lessonId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.sr.cohortKr(courseId ?? "", lessonId ?? ""),
    queryFn: () =>
      apiFetch<CohortKrResponse>(
        `/teacher/courses/${courseId}/lessons/${lessonId}/cohort-kr`,
      ),
    enabled: !!courseId && !!lessonId,
    staleTime: STALE_5M,
  });
}

export function useDifficultCards(
  courseId: string | undefined,
  lessonId: string | undefined,
  topN = 10,
) {
  return useQuery({
    queryKey: queryKeys.sr.difficultCards(
      courseId ?? "",
      lessonId ?? "",
      topN,
    ),
    queryFn: () =>
      apiFetch<DifficultCard[]>(
        `/teacher/courses/${courseId}/lessons/${lessonId}/difficult-cards?top_n=${topN}`,
      ),
    enabled: !!courseId && !!lessonId,
    staleTime: STALE_5M,
  });
}

export function useAtRiskStudents(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sr.atRisk(courseId ?? ""),
    queryFn: () =>
      apiFetch<AtRiskStudent[]>(
        `/teacher/courses/${courseId}/at-risk`,
      ),
    enabled: !!courseId,
    staleTime: STALE_5M,
  });
}

export type UseStudentSrDetailOptions = {
  recentReviewsLimit?: number;
};

export function useStudentSrDetail(
  courseId: string | undefined,
  studentId: string | undefined,
  opts: UseStudentSrDetailOptions = {},
) {
  const { recentReviewsLimit = 20 } = opts;
  return useQuery({
    queryKey: queryKeys.sr.studentDetail(
      courseId ?? "",
      studentId ?? "",
    ),
    queryFn: () =>
      apiFetch<StudentSrDetail>(
        `/teacher/courses/${courseId}/students/${studentId}/sr-detail?recent_reviews_limit=${recentReviewsLimit}`,
      ),
    enabled: !!courseId && !!studentId,
    staleTime: STALE_5M,
  });
}
