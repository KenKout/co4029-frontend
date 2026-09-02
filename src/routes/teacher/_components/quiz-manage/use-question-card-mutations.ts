import { toast } from "sonner";
import type { TFunction } from "i18next";

import { ApiError } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/error-codes";
import {
  useDuplicateQuizQuestion,
  useCopyQuizQuestionsToCuratedBank,
  useRegenerateQuestion,
  useUpdateQuizQuestion,
} from "@/lib/api/hooks/quizzes";

/**
 * The three question-level mutations a QuestionCard owns, plus the two handlers
 * whose only job is to fire one and toast the outcome. Extracted from
 * QuestionCard; the hooks are called in the same order the card used inline
 * (update → regenerate → duplicate).
 */

export function useQuestionCardMutations(
  courseId: string,
  quizId: string,
  questionId: string,
  t: TFunction,
) {
  const updateQuestion = useUpdateQuizQuestion(quizId, questionId);
  const regenerate = useRegenerateQuestion(quizId, questionId);
  const duplicate = useDuplicateQuizQuestion(quizId);
  const addToBank = useCopyQuizQuestionsToCuratedBank(courseId);

  async function handleAddToBank() {
    try {
      const { skipped } = await addToBank.mutateAsync([questionId]);
      if (skipped.includes(questionId)) {
        toast.info("Question is already in the curated bank");
      } else {
        toast.success("Question added to the curated bank");
      }
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Could not add question to bank"),
      );
    }
  }

  async function handleDuplicate() {
    try {
      await duplicate.mutateAsync(questionId);
      toast.success(
        t(
          "teacher_quiz_manage.editor.duplicate_success",
          "Question duplicated (added as a pending copy)",
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.message
          ? err.message
          : t(
              "teacher_quiz_manage.editor.duplicate_error",
              "Could not duplicate the question",
            ),
      );
    }
  }

  async function handleRegenerate() {
    try {
      await regenerate.mutateAsync();
      toast.success(t("teacher_quiz_manage.toasts.regen_started"));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t("teacher_quiz_manage.toasts.regen_in_progress"));
        return;
      }
      toast.error(
        (err as Error).message || t("teacher_quiz_manage.toasts.regen_failed"),
      );
    }
  }

  return {
    updateQuestion,
    regenerate,
    duplicate,
    addToBank,
    handleAddToBank,
    handleDuplicate,
    handleRegenerate,
  };
}
