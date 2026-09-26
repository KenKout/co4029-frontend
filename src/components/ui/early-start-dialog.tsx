import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckboxField } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export interface EarlyStartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle: string;
  isPending?: boolean;
  onConfirm: () => void;
}

/** Confirm starting a course before its preceding advisory stage is complete. */
export function EarlyStartDialog({
  open,
  onOpenChange,
  courseTitle,
  isPending = false,
  onConfirm,
}: EarlyStartDialogProps) {
  const { t } = useTranslation();
  const [understood, setUnderstood] = useState(false);

  useEffect(() => {
    if (!open) setUnderstood(false);
  }, [open]);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("early_start.title")}
      description={t("early_start.description", { course: courseTitle })}
      confirmLabel={t("early_start.confirm")}
      cancelLabel={t("early_start.cancel")}
      confirmVariant="default"
      confirmDisabled={!understood}
      isPending={isPending}
      onConfirm={onConfirm}
      extraContent={
        <CheckboxField
          checked={understood}
          onCheckedChange={setUnderstood}
          label={t("early_start.checkbox")}
        />
      }
    />
  );
}
