import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../client";
import { queryKeys } from "../../query-keys";
import type {
  QuizAttemptReviewQuestion,
  QuizAttemptTeacherRead,
} from "../../types";

/** Server-side narrowing for the teacher's course-wide attempt list. */
export interface CourseAssessmentQuery {
  /** Matches the student's display name or the quiz / interview title. */
  search?: string;
  /** Exact title, as offered by the summary endpoint's title list. */
  title?: string;
  /** One `Result` bucket; the server rejects anything outside the set. */
  result?: string;
  /** ISO-8601 lower bound on the row's timestamp. */
  since?: string;
  /** Page size; the server caps this at 100. */
  limit?: number;
  /** Opaque cursor from the previous page's `next_cursor`. */
  cursor?: string;
}

export interface QuizAttemptTeacherPage {
  items: QuizAttemptTeacherRead[];
  next_cursor: string | null;
}

/** Drops empty values so the query key and the URL agree on "no filter". */
export function assessmentSearchParams(
  query: CourseAssessmentQuery,
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params[key] = String(value);
  }
  return params;
}

/**
 * Teacher: one page of quiz attempts across every quiz in a course.
 */
export function useCourseQuizAttempts(
  courseId: string | null | undefined,
  query: CourseAssessmentQuery = {},
  options: { enabled?: boolean } = {},
) {
  const params = assessmentSearchParams(query);
  return useQuery({
    queryKey: queryKeys.quizzes.courseAttempts(courseId ?? "", params),
    queryFn: () => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<QuizAttemptTeacherPage>(
        `/teacher/courses/${courseId}/quiz-attempts${qs ? `?${qs}` : ""}`,
      );
    },
    enabled: !!courseId && (options.enabled ?? true),
    staleTime: 2000,
    placeholderData: (previous) => previous,
  });
}

export interface CourseAssessmentSummary {
  students_assessed: number;
  quiz_attempt_count: number;
  quiz_pass_rate: number | null;
  interview_session_count: number;
  quiz_titles: string[];
  interview_titles: string[];
}

/**
 * Teacher: whole-course assessment aggregates for the summary tiles and the title dropdowns.
 */
export function useCourseAssessmentSummary(
  courseId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.quizzes.courseAssessmentSummary(courseId ?? ""),
    queryFn: () =>
      apiFetch<CourseAssessmentSummary>(
        `/teacher/courses/${courseId}/assessment-summary`,
      ),
    enabled: !!courseId,
    staleTime: 2000,
  });
}

/**
 * Teacher-facing per-attempt detail.
 */
export interface QuizAttemptIntegrityEvent {
  id: string;
  event_type: string;
  severity: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface QuizAttemptTeacherReview {
  attempt: QuizAttemptTeacherRead;
  questions: QuizAttemptReviewQuestion[];
  integrity_events: QuizAttemptIntegrityEvent[];
}

export function useCourseQuizAttemptDetail(
  courseId: string | null | undefined,
  attemptId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.quizzes.attemptDetail(courseId ?? "", attemptId ?? ""),
    queryFn: () =>
      apiFetch<QuizAttemptTeacherReview>(
        `/teacher/courses/${courseId}/quiz-attempts/${attemptId}`,
      ),
    enabled: !!courseId && !!attemptId,
  });
}

/** Teacher: one student's quiz attempts across a course's quizzes. */
export function useStudentQuizAttempts(
  courseId: string | null | undefined,
  studentId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.quizzes.studentAttempts(
      courseId ?? "",
      studentId ?? "",
    ),
    queryFn: () =>
      apiFetch<QuizAttemptTeacherRead[]>(
        `/teacher/courses/${courseId}/students/${studentId}/quiz-attempts`,
      ),
    enabled: !!courseId && !!studentId,
  });
}
