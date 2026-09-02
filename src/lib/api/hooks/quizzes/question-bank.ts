import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../../client";
import { queryKeys } from "../../query-keys";
import { useInfinitePage } from "../../use-infinite-page";
import type {
  QuestionBankEntry,
  QuestionBankImportRequest,
  QuizQuestionBankCopyResult,
  QuizQuestionBankItem,
  QuizQuestionBankItemCreate,
  QuizQuestionBankItemUpdate,
  QuizQuestionBankStatus,
  QuizQuestionAuthoring,
} from "../../types";

/**
 * Question bank — cursor-paginated authored questions across the course.
 *
 * Default ``review_status='approved'`` filters out drafts; pass
 * ``reviewStatus: ""`` to widen. ``excludeQuizId`` is convenient when
 * launched from a target quiz so its own questions don't reappear.
 *
 * Returns flattened `items[]` plus infinite-scroll handles. The modal
 * pairs this with `<InfiniteList>` so the list auto-loads on scroll.
 */
export function useQuestionBank(
  courseId: string | null | undefined,
  filters: {
    moduleId?: string;
    lessonId?: string;
    questionType?: string;
    bloomLevel?: string;
    difficulty?: string;
    reviewStatus?: string;
    search?: string;
    excludeQuizId?: string;
  } = {},
  options: { enabled?: boolean; limit?: number } = {},
) {
  const enabled = (options.enabled ?? true) && !!courseId;
  const limit = options.limit ?? 50;
  return useInfinitePage<QuestionBankEntry>({
    queryKey: queryKeys.quizzes.bank(courseId ?? "", filters),
    fetch: async (cursor, pageLimit = limit) => {
      const params = new URLSearchParams();
      if (filters.moduleId) params.set("module_id", filters.moduleId);
      if (filters.lessonId) params.set("lesson_id", filters.lessonId);
      if (filters.questionType)
        params.set("question_type", filters.questionType);
      if (filters.bloomLevel) params.set("bloom_level", filters.bloomLevel);
      if (filters.difficulty) params.set("difficulty", filters.difficulty);
      if (filters.reviewStatus !== undefined) {
        params.set("review_status", filters.reviewStatus);
      }
      if (filters.search) params.set("search", filters.search);
      if (filters.excludeQuizId) {
        params.set("exclude_quiz_id", filters.excludeQuizId);
      }
      if (pageLimit) params.set("limit", String(pageLimit));
      if (cursor) params.set("cursor", cursor);
      const qs = params.toString();
      const page = await apiFetch<{
        items: QuestionBankEntry[];
        next_cursor: string | null;
      }>(`/teacher/courses/${courseId}/question-bank${qs ? `?${qs}` : ""}`);
      return { items: page.items, next_cursor: page.next_cursor ?? null };
    },
    limit,
    enabled,
  });
}

export interface CuratedBankFilters {
  status?: QuizQuestionBankStatus | "";
  questionType?: string;
  bloomLevel?: string;
  difficulty?: string;
  search?: string;
}

/** Independent, curated course-level Quiz Question Bank.
 *
 * The `search` filter is debounced inside the hook: the input's keystrokes
 * update the caller's state immediately, but a request only fires 350 ms
 * after typing stops. Status/type/difficulty changes still refetch right
 * away.
 */
export function useCuratedQuizQuestionBank(
  courseId: string | null | undefined,
  filters: CuratedBankFilters = {},
  options: { enabled?: boolean; limit?: number } = {},
) {
  const enabled = (options.enabled ?? true) && !!courseId;
  const limit = options.limit ?? 50;
  const debouncedSearch = useDebouncedValue(filters.search ?? "", 350);
  return useInfinitePage<QuizQuestionBankItem>({
    queryKey: queryKeys.quizzes.curatedBank(courseId ?? "", {
      ...filters,
      search: debouncedSearch,
    }),
    fetch: async (cursor, pageLimit = limit) => {
      const params = new URLSearchParams();
      if (filters.status) params.set("bank_status", filters.status);
      if (filters.questionType)
        params.set("question_type", filters.questionType);
      if (filters.bloomLevel) params.set("bloom_level", filters.bloomLevel);
      if (filters.difficulty) params.set("difficulty", filters.difficulty);
      const search = debouncedSearch.trim();
      if (search) params.set("search", search);
      params.set("limit", String(pageLimit));
      if (cursor) params.set("cursor", cursor);
      const page = await apiFetch<{
        items: QuizQuestionBankItem[];
        next_cursor: string | null;
      }>(`/teacher/courses/${courseId}/quiz-question-bank?${params}`);
      return { items: page.items, next_cursor: page.next_cursor };
    },
    limit,
    enabled,
  });
}

function invalidateCuratedBank(
  queryClient: ReturnType<typeof useQueryClient>,
  courseId: string | null | undefined,
) {
  return queryClient.invalidateQueries({
    queryKey: ["quizzes", "curated-bank", courseId ?? ""],
  });
}

export function useCreateCuratedQuizQuestion(
  courseId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuizQuestionBankItemCreate) =>
      apiPost<QuizQuestionBankItem>(
        `/teacher/courses/${courseId}/quiz-question-bank`,
        payload,
      ),
    onSuccess: () => invalidateCuratedBank(queryClient, courseId),
  });
}

export function useCopyQuizQuestionsToCuratedBank(
  courseId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionIds: string[]) =>
      apiPost<QuizQuestionBankCopyResult>(
        `/teacher/courses/${courseId}/quiz-question-bank/from-questions`,
        { question_ids: questionIds },
      ),
    onSuccess: () => invalidateCuratedBank(queryClient, courseId),
  });
}

export type CopyToCuratedBankMutation = ReturnType<
  typeof useCopyQuizQuestionsToCuratedBank
>;

export function useUpdateCuratedQuizQuestion(
  courseId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      patch,
    }: {
      itemId: string;
      patch: QuizQuestionBankItemUpdate;
    }) =>
      apiPatch<QuizQuestionBankItem>(
        `/teacher/courses/${courseId}/quiz-question-bank/${itemId}`,
        patch,
      ),
    onSuccess: () => invalidateCuratedBank(queryClient, courseId),
  });
}

export function useSetCuratedQuizQuestionStatus(
  courseId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      status,
    }: {
      itemId: string;
      status: "approved" | "archived";
    }) =>
      apiPost<QuizQuestionBankItem>(
        `/teacher/courses/${courseId}/quiz-question-bank/${itemId}/status`,
        { status },
      ),
    onSuccess: () => invalidateCuratedBank(queryClient, courseId),
  });
}

export function useDeleteCuratedQuizQuestion(
  courseId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiDelete(
        `/teacher/courses/${courseId}/quiz-question-bank/${itemId}`,
      ),
    onSuccess: () => invalidateCuratedBank(queryClient, courseId),
  });
}

export function useImportCuratedQuizQuestions(
  quizId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) =>
      apiPost<QuizQuestionAuthoring[]>(
        `/teacher/quizzes/${quizId}/questions/import-bank`,
        { item_ids: itemIds },
      ),
    onSuccess: () => {
      if (quizId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}

export function useImportQuestionsFromBank(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceQuestionIds: string[]) => {
      if (!quizId) throw new Error("quizId is required");
      const body: QuestionBankImportRequest = {
        source_question_ids: sourceQuestionIds,
      };
      return apiPost<QuizQuestionAuthoring[]>(
        `/teacher/quizzes/${quizId}/questions/import`,
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
      void qc.invalidateQueries({ queryKey: ["quizzes", "bank"] });
    },
  });
}
