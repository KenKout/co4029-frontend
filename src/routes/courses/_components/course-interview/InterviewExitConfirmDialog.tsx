import { useTranslation } from "react-i18next";
import { CircleAlert, Maximize } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * The interview's accidental-exit confirmation, shown OVER the mandatory
 * fullscreen gate the moment fullscreen is lost (Escape / F11 / OS gesture).
 *
 * The browser has ALREADY left fullscreen — that cannot be intercepted — so
 * the dialog decides what the exit MEANS, not whether it happened:
 *  - "Back" re-enters fullscreen; the exit is confirmed accidental and the
 *    held integrity event is dropped (not scored).
 *  - "Continue" accepts the windowed interview; the held event is recorded
 *    and the integrity warning (with the config's fullscreen_exit weight)
 *    is shown.
 * While the dialog is open the gate screen underneath stays up (no session
 * content either way), so nothing leaks and the room stays disconnected.
 */
export function InterviewExitConfirmDialog({
  open,
  exitPoints,
  onBack,
  onContinue,
}: {
  open: boolean;
  /** Integrity points a fullscreen exit costs (from the published config). */
  exitPoints: number;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={() => undefined}
      showCancel={false}
      title={t("course_interview.fullscreen_exit_confirm.title")}
      description={t("course_interview.fullscreen_exit_confirm.description")}
      extraContent={
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span aria-live="polite">
            {t("course_interview.fullscreen_exit_confirm.warning", {
              points: exitPoints,
            })}
          </span>
        </p>
      }
      confirmLabel={
        <span className="flex items-center gap-2">
          <Maximize className="h-4 w-4" aria-hidden="true" />
          {t("course_interview.fullscreen_exit_confirm.back")}
        </span>
      }
      extraButtons={
        <Button
          type="button"
          variant="ghost"
          onClick={onContinue}
          className="text-destructive hover:bg-destructive/10"
        >
          {t("course_interview.fullscreen_exit_confirm.continue")}
        </Button>
      }
      onConfirm={onBack}
    />
  );
}
