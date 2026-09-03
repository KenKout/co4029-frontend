import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost } from "../../client";
import { queryKeys } from "../../query-keys";
import type {
  QuizAttemptAnswerRead,
  QuizAttemptRead,
  QuizAttemptProgressRead,
  QuizAttemptProgressAnswer,
  QuizAttemptReviewRead,
  QuizAttemptStart,
  QuizAttemptSubmitAnswer,
} from "../../types";

export type { QuizAttemptProgressAnswer, QuizAttemptProgressRead };

export function useStartQuizAttempt(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: Partial<QuizAttemptStart>) =>
      apiPost<QuizAttemptProgressRead>(`/quizzes/${quizId}/attempts`, {
        quiz_id: quizId ?? "",
        ...body,
      }),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.myAttempts(quizId),
        });
      }
    },
  });
}

/**
 * Resume payload for an in-progress attempt — rehydrates the take payload
 * (quiz + questions) plus every answer saved so far. Pairs with
 * `useStartQuizAttempt`, which returns the same shape for a fresh attempt.
 */
export function useQuizAttemptProgress(attemptId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.attemptProgress(attemptId ?? ""),
    queryFn: () =>
      apiFetch<QuizAttemptProgressRead>(`/attempts/${attemptId}/progress`),
    enabled: !!attemptId,
  });
}

export function useSubmitQuizAnswer(attemptId: string | null | undefined) {
  return useMutation({
    mutationFn: (payload: QuizAttemptSubmitAnswer) =>
      apiPost<QuizAttemptAnswerRead>(`/attempts/${attemptId}/answers`, payload),
  });
}

export function useSubmitQuizAttempt(attemptId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<QuizAttemptRead>(`/attempts/${attemptId}/submit`),
    onSuccess: (attempt) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.attempt(attempt.id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.myAttempts(attempt.quiz_id),
      });
    },
  });
}

export function useQuizAttempt(attemptId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.attempt(attemptId ?? ""),
    queryFn: () => apiFetch<QuizAttemptRead>(`/attempts/${attemptId}`),
    enabled: !!attemptId,
  });
}

export function useMyQuizAttempts(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.myAttempts(quizId ?? ""),
    queryFn: () =>
      apiFetch<QuizAttemptRead[]>(`/me/quizzes/${quizId}/attempts`),
    enabled: !!quizId,
  });
}

export function useQuizAttemptReview(attemptId: string | null | undefined) {
  return useQuery({
    queryKey: ["quizzes", "attempt-review", attemptId ?? ""],
    queryFn: () =>
      apiFetch<QuizAttemptReviewRead>(`/attempts/${attemptId}/review`),
    enabled: !!attemptId,
    staleTime: 1000 * 60 * 10, // submitted attempts don't change
  });
}
