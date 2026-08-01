import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost } from "../../client";
import { queryKeys } from "../../query-keys";
import { useInfinitePage } from "../../use-infinite-page";
import type {
  QuestionBankEntry,
  QuestionBankImportRequest,
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
