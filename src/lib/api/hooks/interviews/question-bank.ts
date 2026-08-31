import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiFetch, apiPatch, apiPost } from "../../client";
import { queryKeys } from "../../query-keys";
import type {
  InterviewQuestionBankImportResult,
  InterviewQuestionBankItemCreate,
  InterviewQuestionBankItemRead,
  InterviewQuestionBankItemUpdate,
  InterviewQuestionBankLogicalGroupCreate,
} from "../../types";

/**
 * Course-scoped interview question bank hooks (§QBank-1/§QBank-2), split out of
 * `interviews.ts` when that file hit the 800-line cap. Re-exported from
 * `interviews.ts`, so every existing import path keeps working.
 */

/**
 * Course-scoped interview question bank (§QBank-1).
 * GET /teacher/courses/{course_id}/interview-question-bank
 */
export function useInterviewQuestionBank(courseId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.questionBank(courseId ?? ""),
    queryFn: () =>
      apiFetch<InterviewQuestionBankItemRead[]>(
        `/teacher/courses/${courseId}/interview-question-bank`,
      ),
    enabled: !!courseId,
  });
}

/**
 * POST /teacher/courses/{course_id}/interview-question-bank — add a reusable
 * question to the course bank (copy semantics).
 */
export function useAddToInterviewQuestionBank(
  courseId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InterviewQuestionBankItemCreate) =>
      apiPost<InterviewQuestionBankItemRead>(
        `/teacher/courses/${courseId}/interview-question-bank`,
        payload,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.interviews.questionBank(courseId ?? ""),
      });
    },
  });
}

/** Create a complete four-angle logical question in the course bank. */
export function useCreateInterviewQuestionBankLogicalGroup(courseId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InterviewQuestionBankLogicalGroupCreate) =>
      apiPost<InterviewQuestionBankItemRead[]>(`/teacher/courses/${courseId}/interview-question-bank/logical-groups`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.interviews.questionBank(courseId ?? "") });
    },
  });
}

/** Add a missing logical angle to a bank singleton or partial group. */
export function useAddInterviewQuestionBankSibling(courseId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: InterviewQuestionBankItemCreate }) =>
      apiPost<InterviewQuestionBankItemRead[]>(`/teacher/courses/${courseId}/interview-question-bank/${itemId}/siblings`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.interviews.questionBank(courseId ?? "") });
    },
  });
}

/** Atomically import standalone questions and full/partial logical groups. */
export function useImportInterviewQuestionBankItems(configId: string | null | undefined, courseId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) =>
      apiPost<InterviewQuestionBankImportResult>(`/teacher/interview-configs/${configId}/questions/import-bank`, { item_ids: itemIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.interviews.configAuthoring(configId ?? "") });
      void queryClient.invalidateQueries({ queryKey: queryKeys.interviews.questionBank(courseId ?? "") });
    },
  });
}

/**
 * DELETE /teacher/courses/{course_id}/interview-question-bank/{item_id}
 */
export function useDeleteInterviewQuestionBankItem(
  courseId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiDelete(
        `/teacher/courses/${courseId}/interview-question-bank/${itemId}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.interviews.questionBank(courseId ?? ""),
      });
    },
  });
}

/**
 * DELETE /teacher/courses/{course_id}/interview-question-bank/{item_id}/group
 * — soft-delete every angle of one logical question in the course bank.
 */
export function useDeleteInterviewQuestionBankGroup(
  courseId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiDelete<{ deleted: number }>(
        `/teacher/courses/${courseId}/interview-question-bank/${itemId}/group`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.interviews.questionBank(courseId ?? ""),
      });
    },
  });
}

/**
 * PATCH /teacher/courses/{course_id}/interview-question-bank/{item_id} —
 * edit a bank item (management page).
 */
export function useUpdateInterviewQuestionBankItem(
  courseId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      patch,
    }: {
      itemId: string;
      patch: InterviewQuestionBankItemUpdate;
    }) =>
      apiPatch<InterviewQuestionBankItemRead>(
        `/teacher/courses/${courseId}/interview-question-bank/${itemId}`,
        patch,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.interviews.questionBank(courseId ?? ""),
      });
    },
  });
}
