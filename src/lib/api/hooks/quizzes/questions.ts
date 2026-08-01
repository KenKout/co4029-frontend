import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";
import { apiDelete, apiPatch, apiPost } from "../../client";
import { queryKeys } from "../../query-keys";
import type {
  BulkSetExpectedTimeRequest,
  BulkSetExpectedTimeResponse,
  GenerationRunRead,
  QuizQuestionAuthoring,
} from "../../types";

export function useAddQuizQuestion(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<QuizQuestionAuthoring>(
        `/teacher/quizzes/${quizId}/questions`,
        payload,
      ),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}

export function useDuplicateQuizQuestion(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) =>
      apiPost<QuizQuestionAuthoring>(
        `/teacher/quizzes/${quizId}/questions/${questionId}/duplicate`,
      ),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}

export function useUpdateQuizQuestion(
  quizId: string | null | undefined,
  questionId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPatch<QuizQuestionAuthoring>(
        `/teacher/quizzes/${quizId}/questions/${questionId}`,
        payload,
      ),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}

export function useDeleteQuizQuestion(
  quizId: string | null | undefined,
  questionId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiDelete(`/teacher/quizzes/${quizId}/questions/${questionId}`),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}

export function useRegenerateQuestion(
  quizId: string | null | undefined,
  questionId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<GenerationRunRead>(
        `/teacher/quizzes/${quizId}/questions/${questionId}/regenerate`,
      ),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}

export function useBulkSetExpectedTime(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      question_ids,
      expected_seconds,
    }: {
      question_ids: string[];
      expected_seconds: number;
    }) => {
      if (question_ids.length === 0) {
        throw new Error(
          i18n.t("teacher_quiz_manage.errors.bulk_select_required"),
        );
      }
      if (!Number.isFinite(expected_seconds) || expected_seconds <= 0) {
        throw new Error(
          i18n.t("teacher_quiz_manage.errors.bulk_seconds_positive"),
        );
      }
      const body: BulkSetExpectedTimeRequest = {
        items: question_ids.map((qid) => ({
          question_id: qid,
          expected_response_time_ms: Math.round(expected_seconds * 1000),
        })),
      };
      return apiPost<BulkSetExpectedTimeResponse>(
        `/teacher/quizzes/${quizId}/questions/bulk-set-expected-time`,
        body,
      );
    },
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}

/**
 * Bulk-approve questions (flip review_status → 'approved' for many at once).
 * The teacher's bulk sign-off for AI-generated content.
 */
export function useBulkApprove(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ question_ids }: { question_ids: string[] }) => {
      if (question_ids.length === 0) {
        throw new Error(
          i18n.t("teacher_quiz_manage.errors.bulk_select_required"),
        );
      }
      return apiPost<{ approved: number }>(
        `/teacher/quizzes/${quizId}/questions/bulk-approve`,
        { question_ids },
      );
    },
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}
