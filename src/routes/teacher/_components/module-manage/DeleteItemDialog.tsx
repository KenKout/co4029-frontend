import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { DeleteItemMutation, TranslateFn } from "./types";
import type { ItemDeleteController } from "./use-item-delete";

/**
 * Confirmation for removing a curriculum item. The repo bans native
 * `confirm()`, so this is the same `<ConfirmDialog>` the page always used —
 * moved verbatim out of `module-manage.tsx`.
 */
export function DeleteItemDialog({
  itemDelete,
  deleteItem,
  t,
}: {
  itemDelete: ItemDeleteController;
  deleteItem: DeleteItemMutation;
  t: TranslateFn;
}) {
  const { pendingDelete, setPendingDelete, confirmDeleteItem } = itemDelete;

  return (
    <ConfirmDialog
      open={pendingDelete !== null}
      onOpenChange={(open) => {
        if (!open) setPendingDelete(null);
      }}
      title={t("teacher_common.delete_item_title")}
      description={t("teacher_common.delete_item_body", {
        title: pendingDelete?.title ?? "",
      })}
      confirmLabel={t("teacher_common.delete_item_confirm")}
      cancelLabel={t("common.cancel", "Cancel")}
      confirmVariant="destructive"
      onConfirm={confirmDeleteItem}
      isPending={deleteItem.isPending}
    />
  );
}
