import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Bulk-delete confirmation. Destructive, so no backdrop dismissal — the dialog
 * primitive blocks it by default. Extracted from QuestionsTab verbatim; `count`
 * is the frozen selection size (null while closed).
 */
export function QuestionsBulkDeleteDialog({
  count,
  onOpenChange,
  onConfirm,
}: {
  count: number | null;
  onOpenChange: (next: boolean) => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={count !== null}
      onOpenChange={onOpenChange}
      title={t("teacher_quiz_manage.confirm_bulk_delete.title", {
        count: count ?? 0,
      })}
      description={t("teacher_quiz_manage.confirm_bulk_delete.body", {
        count: count ?? 0,
      })}
      confirmLabel={t("teacher_quiz_manage.confirm_bulk_delete.confirm", {
        count: count ?? 0,
      })}
      cancelLabel={t("common.cancel", "Cancel")}
      onConfirm={onConfirm}
    />
  );
}
