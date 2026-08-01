import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPatch } from "../../client";
import { queryKeys } from "../../query-keys";

// --- Phase 4: manual grading -----------------------------------------------
export interface NeedsGradingRow {
  answer_id: string;
  attempt_id: string;
  question_id: string;
  student_id: string;
  question_type: string;
  prompt_text: string;
  answer_text: string | null;
  submitted_at: string | null;
}
export interface ManualGradeIn {
  score: number;
  feedback?: string | null;
}

export function useNeedsGrading(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.needsGrading(quizId ?? ""),
    queryFn: () =>
      apiFetch<NeedsGradingRow[]>(`/teacher/quizzes/${quizId}/needs-grading`),
    enabled: !!quizId,
  });
}

export function useGradeAnswer(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      answerId,
      body,
    }: {
      answerId: string;
      body: ManualGradeIn;
    }) =>
      apiPatch(`/teacher/quizzes/${quizId}/answers/${answerId}/grade`, body),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.needsGrading(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.gradebook(quizId),
        });
      }
    },
  });
}

// --- Phase 9: gradebook -----------------------------------------------------
export interface QuizGradeRow {
  student_id: string;
  grade_percent: number;
  grade_points: number;
  passed: boolean;
  grading_method: string;
  based_on_attempt_id: string | null;
  attempts_counted: number;
}

export function useQuizGradebook(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.gradebook(quizId ?? ""),
    queryFn: () =>
      apiFetch<QuizGradeRow[]>(`/teacher/quizzes/${quizId}/gradebook`),
    enabled: !!quizId,
  });
}
