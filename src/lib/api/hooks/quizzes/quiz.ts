import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../../client";
import { ApiError } from "../../client";
import { queryKeys } from "../../query-keys";
import type {
  QuizAuthoring,
  QuizForAuthoringPublic,
  QuizPublic,
  QuizResultsRead,
} from "../../types";

export function useStudentQuiz(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.detail(quizId ?? ""),
    queryFn: () => apiFetch<QuizPublic>(`/quizzes/${quizId}`),
    enabled: !!quizId,
  });
}

export function useQuizAuthoring(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.authoring(quizId ?? ""),
    queryFn: () =>
      apiFetch<QuizForAuthoringPublic>(`/teacher/quizzes/${quizId}`),
    enabled: !!quizId,
  });
}

/**
 * Teacher-facing per-quiz results & analytics
 * (`GET /teacher/quizzes/{quizId}/results`): grading-method-aware summary
 * (mean/median/quartiles/pass-rate/histogram), per-student rollup, and
 * per-question breakdown. Powers the quiz results dashboard.
 */
export function useQuizResults(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.results(quizId ?? ""),
    queryFn: () =>
      apiFetch<QuizResultsRead>(`/teacher/quizzes/${quizId}/results`),
    enabled: !!quizId,
  });
}

export function useCreateQuiz(courseId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<QuizAuthoring>(`/teacher/courses/${courseId}/quizzes`, payload),
    onSuccess: (quiz) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.authoring(quiz.id),
      });
      if (courseId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.courses.content(courseId),
        });
      }
    },
  });
}

export function usePatchQuiz(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPatch<QuizAuthoring>(`/teacher/quizzes/${quizId}`, payload),
    onSuccess: (quiz) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.authoring(quiz.id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.courses.content(quiz.course_id),
      });
    },
  });
}

const PUBLISH_MISSING_TEXP_KEY =
  "teacher_quiz_manage.errors.publish_missing_t_exp";

export function usePublishQuiz(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<QuizAuthoring>(`/teacher/quizzes/${quizId}/publish`),
    onSuccess: (quiz) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.authoring(quiz.id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.courses.content(quiz.course_id),
      });
      // The teacher course-manage tree reads from a SEPARATE query key
      // (["teacher","courses",id,"content"]), not queryKeys.courses.content.
      // Without this invalidation an inline publish from the course view
      // succeeds server-side but leaves the item's status badge stale.
      void qc.invalidateQueries({
        queryKey: ["teacher", "courses", quiz.course_id, "content"],
      });
    },
    onError: (err: unknown) => {
      if (
        err instanceof ApiError &&
        err.status === 422 &&
        (err.code === "missing_t_exp" ||
          err.code === "missing_expected_response_time" ||
          err.code === "missing_expected_time")
      ) {
        toast.error(i18n.t(PUBLISH_MISSING_TEXP_KEY));
      }
    },
  });
}

export function useDeleteQuiz(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete(`/teacher/quizzes/${quizId}`),
    onSuccess: () => {
      if (quizId) {
        qc.removeQueries({ queryKey: queryKeys.quizzes.authoring(quizId) });
        qc.removeQueries({ queryKey: queryKeys.quizzes.questions(quizId) });
      }
    },
  });
}
