import { useState } from "react";
import { Library, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getApiErrorMessage } from "@/lib/api/error-codes";
import {
  useCopyQuizQuestionsToCuratedBank,
  type CopyToCuratedBankMutation,
} from "@/lib/api/hooks/quizzes";

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
      onOpenChange(false);
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
      backdropClassName="backdrop-blur-none"
      onConfirm={() => void handleAddSelectedToBank()}
    />
  );
}

/**
 * Own the dialog state next to its trigger instead of in QuestionsTab.
 * Opening this confirmation must not re-render every question editor in the
 * tab — a long quiz can contain dozens of comparatively heavy cards.
 */
export function AddToCuratedBankButton({
  courseId,
  ids,
  onCleared,
}: {
  courseId: string;
  ids: string[];
  onCleared: () => void;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useCopyQuizQuestionsToCuratedBank(courseId);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={mutation.isPending}
        className="h-9 gap-1.5"
      >
        {mutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Library className="h-3.5 w-3.5" />
        )}
        Add to bank
      </Button>
      <AddToCuratedBankDialog
        ids={ids}
        mutation={mutation}
        open={open}
        onOpenChange={setOpen}
        onCleared={onCleared}
      />
    </>
  );
}
