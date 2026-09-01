import { useQueries, useQuery } from "@tanstack/react-query";
import { apiFetch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import { useInfinitePage } from "../use-infinite-page";
import type {
  AtRiskStudent,
  CardDue,
  CardsDuePage,
  CohortKrResponse,
  DifficultCard,
  LessonOverviewItem,
  ReviewQueue,
  ReviewSubmitRequest,
  ReviewSubmitResult,
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Turn a `?lesson=` URL value into the right scope option.
 *
 * Review URLs now carry a lesson SLUG, but links minted before that — SR
 * reminder emails, notifications, a student's bookmark — carry a UUID, and
 * those must keep resolving. Same shape as the course-learn route, which
 * matches on slug and falls back to id for exactly this reason.
 *
 * Sniffing the value beats adding a second query key: the two are
 * alternative spellings of one scope, and a UUID is unambiguous enough that
 * a lesson slug can never be mistaken for one (slugs are title-derived and
 * hyphen-joined, never 8-4-4-4-12 hex).
 */
export function lessonScopeFromParam(
  lesson: string | undefined,
): { lessonId?: string; lessonSlug?: string } {
  if (!lesson) return {};
  return UUID_RE.test(lesson) ? { lessonId: lesson } : { lessonSlug: lesson };
}

export type UseCardsDueOptions = {
  /** Scope by lesson UUID. Kept for links minted before slugs existed. */
  lessonId?: string;
  /**
   * Scope by lesson slug, paired with `courseSlug`. Preferred, so review
   * URLs read as `?course=os&lesson=deadlocks` rather than carrying a raw
   * UUID. Lesson slugs are unique per module, not per course — a course
   * with two "Introduction" lessons scopes to both, which is deliberate
   * (see the SQL comment in the SR learner router).
   */
  lessonSlug?: string;
  courseSlug?: string;
  limit?: number;
  enabled?: boolean;
};

export function useCardsDue(opts: UseCardsDueOptions = {}) {
  const { lessonId, lessonSlug, courseSlug, limit = 20, enabled } = opts;
  return useInfinitePage<CardDue>({
    queryKey: queryKeys.sr.cardsDue(lessonId ?? lessonSlug, limit, courseSlug),
    fetch: async (cursor, lim = limit) => {
      const params = new URLSearchParams();
      if (lessonId) params.set("lesson_id", lessonId);
      if (lessonSlug) params.set("lesson_slug", lessonSlug);
      if (courseSlug) params.set("course_slug", courseSlug);
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

/**
 * Review queue — `GET /me/review/queue`. Due cards + their no-leak question
 * payloads, so a student can resolve cards without re-taking the whole quiz.
 * Not infinite: the review session pulls one batch, and the count shrinks as
 * cards are answered (refetched on invalidation).
 */
export function useReviewQueue(opts: UseCardsDueOptions = {}) {
  const { lessonId, lessonSlug, courseSlug, limit = 20, enabled } = opts;
  return useQuery({
    // The key folds id and slug into one slot: they are alternative spellings
    // of the same scope, and only ever one is set.
    queryKey: queryKeys.sr.reviewQueue(lessonId ?? lessonSlug, limit, courseSlug),
    queryFn: () => {
      const params = new URLSearchParams();
      if (lessonId) params.set("lesson_id", lessonId);
      if (lessonSlug) params.set("lesson_slug", lessonSlug);
      if (courseSlug) params.set("course_slug", courseSlug);
      if (limit) params.set("limit", String(limit));
      const qs = params.toString();
      return apiFetch<ReviewQueue>(
        qs ? `/me/review/queue?${qs}` : "/me/review/queue",
      );
    },
    enabled,
    staleTime: 0,
  });
}

/**
 * Submit one review answer — `POST /me/review/{questionId}`. Grades the answer,
 * fires the SM-2 reschedule, and returns feedback + the remaining due count.
 * Returns a plain async submit fn (not a react-query mutation) so the review
 * page can drive its own local card-by-card state machine.
 */
export function submitReview(
  questionId: string,
  body: ReviewSubmitRequest,
): Promise<ReviewSubmitResult> {
  return apiPost<ReviewSubmitResult>(`/me/review/${questionId}`, body);
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
