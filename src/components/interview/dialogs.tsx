/**
 * Confirmation and prompt dialogs for the interview session.
 *
 * Extracted from `interview-workspace.tsx` (step 3 of that file's decomposition).
 * These are leaf components: they take open/callback props, render a
 * `ConfirmDialog`, and hold no interview state of their own — which is why they
 * were the first UI cluster to move.
 */

import { useTranslation } from "react-i18next";
import {
  CircleAlert,
  CircleHelp,
  Loader2,
  Maximize,
  PhoneOff,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
 * Fullscreen consent gate. Shown the moment a session becomes active, before
 * the candidate can answer. Browsers only grant `requestFullscreen()` from a
 * user gesture, so entering fullscreen MUST originate from this button — it
 * cannot be done automatically on mount.
 *
 * Not blocking by design: "Continue windowed" is offered because a denied or
 * unsupported fullscreen must never lock a candidate out of their assessment.
 */
export function FullscreenPromptDialog({
  open,
  onConfirm,
  onDecline,
}: {
  open: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onDecline();
      }}
      title={t("course_interview.fullscreen.prompt_title")}
      description={t("course_interview.fullscreen.prompt_description")}
      confirmLabel={
        <span className="flex items-center gap-2">
          <Maximize className="h-4 w-4" aria-hidden="true" />
          {t("course_interview.fullscreen.enter")}
        </span>
      }
      cancelLabel={t("course_interview.fullscreen.continue_windowed")}
      onConfirm={onConfirm}
      confirmVariant="default"
    />
  );
}

/**
 * Warning shown when the candidate leaves fullscreen mid-interview (Escape /
 * F11 / OS gesture). The exit is already recorded as an integrity event by
 * `useIntegrityReporter`; this dialog is the visible level-1 deterrent and the
 * one-click path back in (again, a gesture is required to re-enter).
 */
export function FullscreenExitWarningDialog({
  open,
  onReenter,
  onDismiss,
  exitCount,
}: {
  open: boolean;
  onReenter: () => void;
  onDismiss: () => void;
  exitCount: number;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onDismiss();
      }}
      title={t("course_interview.fullscreen.exit_warning_title")}
      description={t("course_interview.fullscreen.exit_warning_description")}
      extraContent={
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span aria-live="polite">
            {t("course_interview.fullscreen.exit_warning_recorded", {
              count: exitCount,
            })}
          </span>
        </p>
      }
      confirmLabel={
        <span className="flex items-center gap-2">
          <Maximize className="h-4 w-4" aria-hidden="true" />
          {t("course_interview.fullscreen.reenter")}
        </span>
      }
      cancelLabel={t("course_interview.fullscreen.stay_windowed")}
      onConfirm={onReenter}
      confirmVariant="default"
    />
  );
}

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
  const fallbackCopy = isVietnamese
    ? {
        title: "Bạn đã sẵn sàng bắt đầu?",
        description:
          "Trợ lý phỏng vấn ảo sẽ xác nhận âm thanh, ngôn ngữ và mức độ sẵn sàng trước. Đồng hồ chỉ bắt đầu sau khi bạn xác nhận sẵn sàng.",
        cancel: "Chưa sẵn sàng",
      }
    : {
        title: "Ready to begin?",
        description:
          "The virtual interviewer will confirm audio, language, and readiness first. The assessed timer starts only after you confirm that you are ready.",
        cancel: "Not yet",
      };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isResume
          ? t("course_interview.resume_dialog.title")
          : t("course_interview.start_dialog.title", {
              defaultValue: fallbackCopy.title,
            })
      }
      description={
        isResume
          ? t("course_interview.resume_dialog.description")
          : t("course_interview.start_dialog.description", {
              defaultValue: fallbackCopy.description,
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
            <Sparkles className="h-4 w-4" />
            {isResume
              ? t("course_interview.resume_dialog.continue")
              : t("course_interview.actions.start")}
          </span>
        )
      }
      cancelLabel={
        isResume
          ? t("course_interview.resume_dialog.cancel")
          : t("course_interview.start_dialog.cancel", {
              defaultValue: fallbackCopy.cancel,
            })
      }
      onConfirm={onConfirm}
      isPending={isPending}
      confirmVariant="default"
      dismissOnBackdrop
    />
  );
}
