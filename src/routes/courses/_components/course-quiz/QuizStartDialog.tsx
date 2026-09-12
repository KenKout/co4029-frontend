import { useTranslation } from "react-i18next";
import { Loader2, Maximize } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * The start/resume confirmation for a quiz take — and the USER GESTURE that
 * powers the mandatory fullscreen gate.
 *
 * Browsers grant `requestFullscreen()` only under a user activation, so the
 * click that starts the attempt has to be the click that asks for fullscreen.
 * Doing that straight from the intro panel's Start button worked, but it took
 * the student's screen over with no warning; this dialog is the beat in
 * between, so the switch is something they agreed to rather than something
 * that happened to them.
 *
 * The same shape as the interview's `StartInterviewDialog`, including the
 * honest confirm label: the button says it enters fullscreen, because that is
 * what the click does.
 */
export function QuizStartDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  isResume = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  isResume?: boolean;
}) {
  const { t } = useTranslation();
  const prefix = isResume
    ? "course_quiz.start_dialog.resume"
    : "course_quiz.start_dialog.start";

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(`${prefix}_title`)}
      description={t(`${prefix}_description`)}
      confirmLabel={
        <span className="flex items-center gap-2">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Maximize className="h-4 w-4" aria-hidden="true" />
          )}
          {t(`${prefix}_confirm`)}
        </span>
      }
      cancelLabel={t("course_quiz.start_dialog.cancel")}
      onConfirm={onConfirm}
      isPending={isPending}
      confirmVariant="default"
      // Harmless to cancel — the attempt has not started — so an outside click
      // means "not yet" rather than being swallowed.
      dismissOnBackdrop
    />
  );
}
