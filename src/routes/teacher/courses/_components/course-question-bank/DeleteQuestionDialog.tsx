import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { QuestionBankDeletionController } from "./use-question-bank-deletion";

/**
 * Delete confirmations for the course bank: one row, or one whole logical
 * question. Native `confirm()` is banned repo-wide; this is the app's dialog
 * (focus trap, scroll lock, i18n'd labels).
 *
 * Two dialogs rather than one parameterised body: the group case must state how
 * many angles disappear, and only one of the two can ever be open, so the pair
 * costs nothing at runtime while keeping each description literal.
 */
export function DeleteQuestionDialog({
  deletion,
}: {
  deletion: QuestionBankDeletionController;
}) {
  const { t } = useTranslation();
  const {
    confirmDelete,
    setConfirmDelete,
    confirmDeleteGroup,
    setConfirmDeleteGroup,
    isPending,
    isGroupPending,
    doDelete,
    doDeleteGroup,
  } = deletion;
  return (
    <>
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
        title={t("teacher_question_bank.delete_title")}
        description={t("teacher_question_bank.delete_body")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        isPending={isPending}
        onConfirm={() => {
          if (confirmDelete) void doDelete(confirmDelete);
        }}
      />
      <ConfirmDialog
        open={confirmDeleteGroup !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteGroup(null);
        }}
        title={t("teacher_question_bank.delete_group_title")}
        description={t("teacher_question_bank.delete_group_body", {
          count: confirmDeleteGroup?.length ?? 0,
        })}
        confirmLabel={t("teacher_question_bank.delete_group")}
        cancelLabel={t("common.cancel")}
        confirmVariant="destructive"
        isPending={isGroupPending}
        onConfirm={() => {
          if (confirmDeleteGroup) void doDeleteGroup(confirmDeleteGroup);
        }}
      />
    </>
  );
}
