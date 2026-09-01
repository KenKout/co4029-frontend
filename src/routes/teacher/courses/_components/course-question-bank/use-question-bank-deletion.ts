import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import type {
  DeleteBankGroupMutation,
  DeleteBankItemMutation,
  TranslateFn,
} from "./types";

/**
 * Delete confirmation + exit animation for the course-level Question Bank,
 * extracted from the former 843-line course-question-bank.tsx.
 *
 * Two delete scopes, deliberately separate state: a single row, and a whole
 * logical question (every angle of one `variant_group_id`). A grouped item's
 * row-level delete would leave the group short an angle with no UI to see it,
 * so the group action is not a convenience — it is the only way to remove a
 * logical question from the bank in one step. Each scope carries its own
 * confirmation payload so the dialog can state the real blast radius (n
 * angles) instead of a generic "delete this question?".
 */
export interface QuestionBankDeletionController {
  confirmDelete: InterviewQuestionBankItemRead | null;
  setConfirmDelete: Dispatch<
    SetStateAction<InterviewQuestionBankItemRead | null>
  >;
  confirmDeleteGroup: InterviewQuestionBankItemRead[] | null;
  setConfirmDeleteGroup: Dispatch<
    SetStateAction<InterviewQuestionBankItemRead[] | null>
  >;
  deletingIds: Set<string>;
  isPending: boolean;
  isGroupPending: boolean;
  doDelete: (item: InterviewQuestionBankItemRead) => Promise<void>;
  doDeleteGroup: (items: InterviewQuestionBankItemRead[]) => Promise<void>;
}

export function useQuestionBankDeletion(options: {
  t: TranslateFn;
  deleteItem: DeleteBankItemMutation;
  deleteGroup: DeleteBankGroupMutation;
}): QuestionBankDeletionController {
  const { t, deleteItem, deleteGroup } = options;
  const [confirmDelete, setConfirmDelete] =
    useState<InterviewQuestionBankItemRead | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<
    InterviewQuestionBankItemRead[] | null
  >(null);
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

  async function doDeleteGroup(items: InterviewQuestionBankItemRead[]) {
    const anchor = items[0];
    if (!anchor) return;
    setConfirmDeleteGroup(null);
    const ids = items.map((item) => item.id);
    setDeletingIds((prev) => new Set([...prev, ...ids]));
    await new Promise((resolve) => setTimeout(resolve, 280));
    try {
      // One request: the backend deletes every live member of the group under
      // the group advisory lock, so a concurrent sibling-add cannot survive
      // the delete the way N per-row requests would allow.
      const result = await deleteGroup.mutateAsync(anchor.id);
      toast.success(
        t("teacher_question_bank.group_deleted", { count: result.deleted }),
      );
    } catch (err: unknown) {
      toast.error((err as Error).message);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }
  }

  return {
    confirmDelete,
    setConfirmDelete,
    confirmDeleteGroup,
    setConfirmDeleteGroup,
    deletingIds,
    isPending: deleteItem.isPending,
    isGroupPending: deleteGroup.isPending,
    doDelete,
    doDeleteGroup,
  };
}
