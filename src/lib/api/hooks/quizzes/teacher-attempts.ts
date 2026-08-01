import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../client";
import { queryKeys } from "../../query-keys";
import type {
  QuizAttemptReviewQuestion,
  QuizAttemptTeacherRead,
} from "../../types";

/** Teacher: every quiz attempt across every quiz in a course. */
export function useCourseQuizAttempts(courseId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.courseAttempts(courseId ?? ""),
    queryFn: () =>
      apiFetch<QuizAttemptTeacherRead[]>(
        `/teacher/courses/${courseId}/quiz-attempts`,
      ),
    enabled: !!courseId,
  });
}

/**
 * Teacher-facing per-attempt detail. The endpoint
 * (`GET /teacher/courses/{courseId}/quiz-attempts/{attemptId}`) post-dates
 * the committed OpenAPI snapshot, so types are declared locally following
 * this file's convention.
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
