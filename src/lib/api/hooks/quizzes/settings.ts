import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPost, apiPut } from "../../client";
import { queryKeys } from "../../query-keys";

// --- Phase 2: review-visibility --------------------------------------------
// Backend shape: 3 time-windows × 5 flags (schemas/review_options.py). All-true
// default preserves historical always-show behaviour.
export interface ReviewWindowFlags {
  show_score: boolean;
  show_correctness: boolean;
  show_correct_answers: boolean;
  show_explanation: boolean;
  show_points: boolean;
}
export interface ReviewOptions {
  immediately_after: ReviewWindowFlags;
  later_while_open: ReviewWindowFlags;
  after_close: ReviewWindowFlags;
}

// --- Phase 5: overrides -----------------------------------------------------
export interface QuizOverrideIn {
  scope: "user" | "group";
  user_id?: string | null;
  group_id?: string | null;
  available_from?: string | null;
  available_until?: string | null;
  due_at?: string | null;
  time_limit_seconds?: number | null;
  max_attempts?: number | null;
  allow_retakes?: boolean | null;
  cooldown_hours?: number | null;
}
export interface QuizOverrideRead extends QuizOverrideIn {
  id: string;
  quiz_id: string;
}

export function useQuizOverrides(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.overrides(quizId ?? ""),
    queryFn: () =>
      apiFetch<QuizOverrideRead[]>(`/teacher/quizzes/${quizId}/overrides`),
    enabled: !!quizId,
  });
}

export function useCreateOverride(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: QuizOverrideIn) =>
      apiPost<QuizOverrideRead>(`/teacher/quizzes/${quizId}/overrides`, body),
    onSuccess: async (saved) => {
      if (!quizId) return;
      const key = queryKeys.quizzes.overrides(quizId);
      await qc.cancelQueries({ queryKey: key });
      qc.setQueryData<QuizOverrideRead[]>(key, (current = []) => [...current.filter((row) => row.id !== saved.id), saved]);
    },
  });
}

export function useDeleteOverride(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (overrideId: string) =>
      apiDelete(`/teacher/quizzes/${quizId}/overrides/${overrideId}`),
    onSuccess: async (_, removedId) => {
      if (!quizId) return;
      const key = queryKeys.quizzes.overrides(quizId);
      await qc.cancelQueries({ queryKey: key });
      qc.setQueryData<QuizOverrideRead[]>(key, (current = []) => current.filter((row) => row.id !== removedId));
    },
  });
}

// --- Phase 8: feedback bands -----------------------------------------------
export interface FeedbackBandIn {
  min_grade: number;
  max_grade: number;
  feedback_text: string;
  feedback_format?: string;
}
export interface FeedbackBandRead extends Omit<FeedbackBandIn, "min_grade" | "max_grade"> {
  id: string;
  quiz_id?: string;
  min_grade: number | string;
  max_grade: number | string;
}

export function useFeedbackBands(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.feedbackBands(quizId ?? ""),
    queryFn: () =>
      apiFetch<FeedbackBandRead[]>(`/teacher/quizzes/${quizId}/feedback-bands`),
    enabled: !!quizId,
  });
}

export function useSetFeedbackBands(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bands: FeedbackBandIn[]) =>
      apiPut<FeedbackBandRead[]>(`/teacher/quizzes/${quizId}/feedback-bands`, {
        bands,
      }),
    onSuccess: async (bands) => {
      if (!quizId) return;
      const key = queryKeys.quizzes.feedbackBands(quizId);
      // The write response is authoritative. An older in-flight GET must not
      // replace it, and a redundant immediate GET may show stale data.
      await qc.cancelQueries({ queryKey: key });
      qc.setQueryData(key, bands);
    },
  });
}
