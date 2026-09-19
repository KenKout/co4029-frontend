import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function ConfirmArchiveQuizDialog({
  open,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      title={t("teacher_quiz_manage.confirm_archive.title")}
      description={t("teacher_quiz_manage.confirm_archive.body")}
      confirmLabel={t("teacher_quiz_manage.actions.archive")}
      cancelLabel={t("common.cancel")}
      confirmVariant="destructive"
      isPending={pending}
      onConfirm={onConfirm}
    />
  );
}
