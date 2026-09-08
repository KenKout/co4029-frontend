/**
 * Fullscreen proctoring dialogs, shared by the interview take and the quiz
 * take. The only thing that ever differed between the two was the copy, so the
 * translation namespace is a prop rather than the components being duplicated.
 */

import { useTranslation } from "react-i18next";
import { CircleAlert, Maximize } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/** The interview namespace, so existing interview call sites need no prop. */
const DEFAULT_KEY_PREFIX = "course_interview.fullscreen";

/**
 * Fullscreen consent gate. Shown the moment a take becomes active, before the
 * participant can answer. Browsers only grant `requestFullscreen()` from a
 * user gesture, so entering fullscreen MUST originate from this button — it
 * cannot be done automatically on mount.
 *
 * Not blocking by design: "Continue windowed" is offered because a denied or
 * unsupported fullscreen must never lock anyone out of their assessment.
 */
export function FullscreenPromptDialog({
  open,
  onConfirm,
  onDecline,
  keyPrefix = DEFAULT_KEY_PREFIX,
}: {
  open: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  keyPrefix?: string;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onDecline();
      }}
      title={t(`${keyPrefix}.prompt_title`)}
      description={t(`${keyPrefix}.prompt_description`)}
      confirmLabel={
        <span className="flex items-center gap-2">
          <Maximize className="h-4 w-4" aria-hidden="true" />
          {t(`${keyPrefix}.enter`)}
        </span>
      }
      cancelLabel={t(`${keyPrefix}.continue_windowed`)}
      onConfirm={onConfirm}
      confirmVariant="default"
    />
  );
}

/**
 * Warning shown when the participant leaves fullscreen mid-take (Escape / F11 /
 * OS gesture). The exit is already recorded as an integrity event by the
 * feature's integrity reporter; this dialog is the visible level-1 deterrent
 * and the one-click path back in (again, a gesture is required to re-enter).
 */
export function FullscreenExitWarningDialog({
  open,
  onReenter,
  onDismiss,
  exitCount,
  keyPrefix = DEFAULT_KEY_PREFIX,
}: {
  open: boolean;
  onReenter: () => void;
  onDismiss: () => void;
  exitCount: number;
  keyPrefix?: string;
}) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onDismiss();
      }}
      title={t(`${keyPrefix}.exit_warning_title`)}
      description={t(`${keyPrefix}.exit_warning_description`)}
      extraContent={
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span aria-live="polite">
            {t(`${keyPrefix}.exit_warning_recorded`, {
              count: exitCount,
            })}
          </span>
        </p>
      }
      confirmLabel={
        <span className="flex items-center gap-2">
          <Maximize className="h-4 w-4" aria-hidden="true" />
          {t(`${keyPrefix}.reenter`)}
        </span>
      }
      cancelLabel={t(`${keyPrefix}.stay_windowed`)}
      onConfirm={onReenter}
      confirmVariant="default"
    />
  );
}
