import { useQueries, useQuery } from "@tanstack/react-query";
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

/**
 * `prompt_text` was added to the difficult-cards endpoint after the committed
 * OpenAPI snapshot, so we widen the generated type locally rather than
 * regenerate the whole snapshot mid-change.
 */
export type DifficultCardWithPrompt = DifficultCard & { prompt_text: string };

/** Per-student result on a single question (card). Endpoint post-dates snapshot. */
export type CardStudentResult = {
  student_id: string;
  name: string;
  ef: number;
  total_reviews: number;
  last_reviewed_at: string | null;
  last_correct: boolean | null;
  correct_count: number;
  review_count: number;
};

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
      // The committed OpenAPI snapshot for CardsDuePage predates the
      // course_slug enrichment, so cast the items to the widened CardDue.
      const page = await apiFetch<Omit<CardsDuePage, "items"> & {
        items: CardDue[];
      }>(qs ? `/me/cards-due?${qs}` : "/me/cards-due");
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
      apiFetch<StudentLessonSummaryRead>(`/me/lessons/${lessonId}/sr-summary`),
    enabled: !!lessonId,
    staleTime: STALE_5M,
  });
}

export function useCourseSrOverview(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sr.courseOverview(courseId ?? ""),
    queryFn: () =>
      apiFetch<LessonOverviewItem[]>(`/me/courses/${courseId}/sr-overview`),
    enabled: !!courseId,
    staleTime: STALE_60S,
  });
}

/**
 * Fetch SR overviews for several courses at once
 */
export function useCoursesSrOverviews(courseIds: string[]) {
  return useQueries({
    queries: courseIds.map((courseId) => ({
      queryKey: queryKeys.sr.courseOverview(courseId),
      queryFn: () =>
        apiFetch<LessonOverviewItem[]>(`/me/courses/${courseId}/sr-overview`),
      staleTime: STALE_60S,
    })),
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
    queryKey: queryKeys.sr.difficultCards(courseId ?? "", lessonId ?? "", topN),
    queryFn: () =>
      apiFetch<DifficultCardWithPrompt[]>(
        `/teacher/courses/${courseId}/lessons/${lessonId}/difficult-cards?top_n=${topN}`,
      ),
    enabled: !!courseId && !!lessonId,
    staleTime: STALE_5M,
  });
}

export function useCardStudentResults(
  courseId: string | undefined,
  questionId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.sr.cardStudentResults(courseId ?? "", questionId ?? ""),
    queryFn: () =>
      apiFetch<CardStudentResult[]>(
        `/teacher/courses/${courseId}/questions/${questionId}/student-results`,
      ),
    enabled: !!courseId && !!questionId && enabled,
    staleTime: STALE_5M,
  });
}

export function useAtRiskStudents(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sr.atRisk(courseId ?? ""),
    queryFn: () =>
      apiFetch<AtRiskStudent[]>(`/teacher/courses/${courseId}/at-risk`),
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
    queryKey: queryKeys.sr.studentDetail(courseId ?? "", studentId ?? ""),
    queryFn: () =>
      apiFetch<StudentSrDetail>(
        `/teacher/courses/${courseId}/students/${studentId}/sr-detail?recent_reviews_limit=${recentReviewsLimit}`,
      ),
    enabled: !!courseId && !!studentId,
    staleTime: STALE_5M,
  });
}

/**
 * Cross-course SR rollup — `GET /me/sr-dashboard-summary`.
 *
 * Mirror of `StudentDashboardSummaryRead`. Declared locally rather than pulled
 * from the generated schema because `openapi-snapshot.json` is stale and
 * regenerating it sweeps in unrelated churn from other in-flight work.
 */
export interface SrDashboardSummary {
  avg_kr_estimate: number;
  /**
   * False when the student has no tracked cards at all. Distinguishes "no data
   * yet" from a genuine 0% — a new student must not be shown 0% retention.
   */
  has_retention_data: boolean;
  lessons_mature: number;
  lessons_learning: number;
  lessons_locked: number;
  lessons_total: number;
  /** Same predicate as /me/cards-due, so these can't disagree. */
  cards_due_now: number;
  cards_total: number;
  next_unlock_lesson_id: string | null;
  next_unlock_lesson_title: string | null;
  /** Progress toward tau_unlock on the nearest locked lesson, 0-100. */
  next_unlock_progress_pct: number;
}

export function useSrDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.sr.dashboardSummary(),
    queryFn: () => apiFetch<SrDashboardSummary>("/me/sr-dashboard-summary"),
    staleTime: 1000 * 60,
  });
}
