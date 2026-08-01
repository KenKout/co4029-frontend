import { useState } from "react";
import { toast } from "sonner";
import type { DeleteItemMutation, PendingDelete, TranslateFn } from "./types";

/**
 * Pending item deletion — holds the item awaiting confirmation so the
 * destructive delete only fires after the user confirms in the dialog.
 *
 * Extracted from the former 293-line `ModuleManagePage`; the repo bans native
 * `confirm()`, so the flow still goes through the page's `<ConfirmDialog>`.
 */
export function useItemDelete(options: {
  deleteItem: DeleteItemMutation;
  t: TranslateFn;
}) {
  const { deleteItem, t } = options;
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );

  function confirmDeleteItem() {
    if (!pendingDelete) return;
    deleteItem.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success(t("teacher_common.item_removed"));
        setPendingDelete(null);
      },
      onError: (err) => toast.error((err as Error).message),
    });
  }

  return { pendingDelete, setPendingDelete, confirmDeleteItem };
}

export type ItemDeleteController = ReturnType<typeof useItemDelete>;
