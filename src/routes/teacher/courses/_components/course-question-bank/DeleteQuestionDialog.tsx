import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { QuestionBankDeletionController } from "./use-question-bank-deletion";

/**
 * Delete confirmation for a bank item, extracted verbatim from the former
 * 843-line course-question-bank.tsx. Native `confirm()` is banned repo-wide;
 * this is the app's dialog (focus trap, scroll lock, i18n'd labels).
 */
export function DeleteQuestionDialog({
  deletion,
}: {
  deletion: QuestionBankDeletionController;
}) {
  const { t } = useTranslation();
  const { confirmDelete, setConfirmDelete, isPending, doDelete } = deletion;
  return (
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
  );
}
