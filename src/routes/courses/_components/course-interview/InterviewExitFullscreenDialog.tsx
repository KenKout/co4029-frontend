import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function InterviewExitFullscreenDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("course_interview.fullscreen.exit_title")}
      description={t("course_interview.fullscreen.exit_description")}
      cancelLabel={t("course_interview.fullscreen.back")}
      confirmLabel={t("course_interview.fullscreen.continue_windowed")}
      onConfirm={onConfirm}
      confirmVariant="default"
    />
  );
}
