import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import type { DeleteBankItemMutation, TranslateFn } from "./types";

/**
 * Delete confirmation + exit animation for the course-level Question Bank,
 * extracted from the former 843-line course-question-bank.tsx. Two `useState`
 * calls in their original order.
 */
export interface QuestionBankDeletionController {
  confirmDelete: InterviewQuestionBankItemRead | null;
  setConfirmDelete: Dispatch<
    SetStateAction<InterviewQuestionBankItemRead | null>
  >;
  deletingIds: Set<string>;
  isPending: boolean;
  doDelete: (item: InterviewQuestionBankItemRead) => Promise<void>;
}

export function useQuestionBankDeletion(options: {
  t: TranslateFn;
  deleteItem: DeleteBankItemMutation;
}): QuestionBankDeletionController {
  const { t, deleteItem } = options;
  const [confirmDelete, setConfirmDelete] =
    useState<InterviewQuestionBankItemRead | null>(null);
  // Rows animate out before the mutation fires, so the list closes the gap
  // instead of a card blinking out of existence.
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  async function doDelete(item: InterviewQuestionBankItemRead) {
    setConfirmDelete(null);
    setDeletingIds((prev) => new Set(prev).add(item.id));
    // Let the exit transition play out before the row leaves the DOM.
    await new Promise((resolve) => setTimeout(resolve, 280));
    try {
      await deleteItem.mutateAsync(item.id);
      toast.success(t("teacher_question_bank.deleted"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
      // Restore, or the row stays invisible-but-present forever.
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  return {
    confirmDelete,
    setConfirmDelete,
    deletingIds,
    isPending: deleteItem.isPending,
    doDelete,
  };
}
