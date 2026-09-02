import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getApiErrorMessage } from "@/lib/api/error-codes";
import type { CopyToCuratedBankMutation } from "@/lib/api/hooks/quizzes";

/**
 * "Add selected questions to the curated bank" confirm dialog.
 *
 * The mutation is owned by the parent (the bulk bar shares its pending
 * state). The backend skips content that already has a live bank copy
 * instead of failing the whole batch, so the success toast reports both
 * counts — the teacher learns exactly which questions already existed.
 */
export function AddToCuratedBankDialog({
  ids,
  mutation,
  open,
  onOpenChange,
  onCleared,
}: {
  ids: string[];
  mutation: CopyToCuratedBankMutation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCleared: () => void;
}) {
  async function handleAddSelectedToBank() {
    if (ids.length === 0) return;
    try {
      const { created, skipped } = await mutation.mutateAsync(ids);
      if (created.length === 0) {
        toast.info("All selected questions are already in the curated bank");
      } else {
        const drafts = created.filter((item) => item.status === "draft").length;
        const parts = [
          `Added ${created.length} question${created.length === 1 ? "" : "s"} to the curated bank`,
        ];
        if (skipped.length > 0) {
          parts.push(
            `${skipped.length} already existed and were skipped`,
          );
        }
        if (drafts > 0) {
          parts.push(
            `${drafts} ${drafts === 1 ? "is" : "are"} draft${drafts === 1 ? "" : "s"} — approve ${
              drafts === 1 ? "it" : "them"
            } to import`,
          );
        }
        toast.success(parts.join(". ") + ".");
      }
      onCleared();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Could not add selected questions to bank"),
      );
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && mutation.isPending) return;
        onOpenChange(next);
      }}
      title={`Add ${ids.length} questions to curated bank?`}
      description="Independent snapshots will be created. Later edits in this Quiz will not change the bank copies."
      confirmLabel="Add to bank"
      confirmVariant="default"
      isPending={mutation.isPending}
      onConfirm={() => void handleAddSelectedToBank()}
    />
  );
}