import { useTranslation } from "react-i18next";
import { CircleHelp, Loader2, Maximize, PhoneOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { resolveStartDialogCopy } from "@/components/interview/start-dialog-copy";

const fallbackStartTitle = "Ready to start?";
const fallbackResumeTitle = "Resume your attempt?";

export function EndInterviewDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("course_interview.end_dialog.title")}
      description={t("course_interview.end_dialog.description")}
      confirmLabel={
        isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("course_interview.end_dialog.ending")}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <PhoneOff className="h-4 w-4" />
            {t("course_interview.actions.end_interview")}
          </span>
        )
      }
      cancelLabel={t("course_interview.end_dialog.cancel")}
      onConfirm={onConfirm}
      isPending={isPending}
      confirmVariant="destructive"
    />
  );
}

/**
 * End-confirmation gate (Slice 4). Rendered on the main screen (in place of the
 * submitted-answer confirmation) after the interviewer asks the candidate to
 * confirm ending. Visually secondary to the Question Card; the current question
 * + timer stay live behind it. Accessible: aria-live announces the prompt,
 * both actions are ≥44px, focusable, and keyboard-operable.
 */
export function EndConfirmationPanel({
  prompt,
  onContinue,
  onEndAndSubmit,
  isPending,
}: {
  prompt: string;
  onContinue: () => void;
  onEndAndSubmit: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-xl border border-amber-300 bg-amber-50/70 p-4"
      role="group"
      aria-label={t("course_interview.end_confirm.title")}
    >
      <p
        className="flex items-start gap-2 text-sm text-amber-900"
        aria-live="polite"
      >
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{prompt || t("course_interview.end_confirm.prompt")}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px]"
          onClick={onContinue}
          disabled={isPending}
        >
          {t("course_interview.end_confirm.continue")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="min-h-[44px]"
          onClick={onEndAndSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("course_interview.end_dialog.ending")}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <PhoneOff className="h-4 w-4" aria-hidden="true" />
              {t("course_interview.end_confirm.end_and_submit")}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

export function LeaveInterviewDialog({
  open,
  onStay,
  onLeave,
  assessmentStarted,
  hasTimeLimit,
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
  assessmentStarted: boolean;
  hasTimeLimit: boolean;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onStay();
      }}
      title={t("course_interview.leave_dialog.title")}
      description={t(
        !assessmentStarted
          ? "course_interview.leave_dialog.onboarding_description"
          : hasTimeLimit
            ? "course_interview.leave_dialog.assessment_description"
            : "course_interview.leave_dialog.untimed_description",
      )}
      confirmLabel={t("course_interview.leave_dialog.leave")}
      cancelLabel={t("course_interview.leave_dialog.stay")}
      onConfirm={onLeave}
      confirmVariant="default"
    />
  );
}

/**
 * The start/resume confirmation — the USER GESTURE that powers the mandatory
 * fullscreen gate. Browsers only grant requestFullscreen() from a user
 * activation, so this dialog's confirm click is what `handleStart` /
 * `handleRetry` build the sequencing on: fullscreen first, then the start
 * API. It is not a "continue windowed" offer — there is no such path any
 * more — and the copy says what the click does.
 */
export function StartInterviewDialog({
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
  const { t, i18n } = useTranslation();
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language;
  const isVietnamese = activeLanguage?.startsWith("vi") ?? false;
  const fallback = resolveStartDialogCopy(isResume, isVietnamese);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isResume
          ? t("course_interview.resume_dialog.title", {
              defaultValue: fallbackResumeTitle,
            })
          : t("course_interview.start_dialog.title", {
              defaultValue: fallbackStartTitle,
            })
      }
      description={
        isResume
          ? t("course_interview.resume_dialog.description", {
              defaultValue: fallback.description,
            })
          : t("course_interview.start_dialog.description", {
              defaultValue: fallback.description,
            })
      }
      confirmLabel={
        isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("course_interview.actions.starting")}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Maximize className="h-4 w-4" />
            {isResume
              ? t("course_interview.fullscreen.enter_and_resume", {
                  defaultValue: fallback.confirm,
                })
              : t("course_interview.fullscreen.enter_and_start", {
                  defaultValue: fallback.confirm,
                })}
          </span>
        )
      }
      cancelLabel={
        isResume
          ? t("course_interview.resume_dialog.cancel", {
              defaultValue: fallback.cancel,
            })
          : t("course_interview.start_dialog.cancel", {
              defaultValue: fallback.cancel,
            })
      }
      onConfirm={onConfirm}
      isPending={isPending}
      confirmVariant="default"
      dismissOnBackdrop
    />
  );
}
