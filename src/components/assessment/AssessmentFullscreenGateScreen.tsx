import { useTranslation } from "react-i18next";
import { CircleAlert, Loader2, Maximize, MonitorX } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { AssessmentFullscreenGate } from "@/lib/hooks/useAssessmentFullscreenGate";

/**
 * The MANDATORY fullscreen gate screen, shared by every proctored assessment
 * (interview take and quiz take). Routes render it IN PLACE OF the workspace
 * whenever a live session exists but the browser is not fullscreen
 * (`gate.requiredOpen`).
 *
 * Deliberately neutral: it receives NO transcript, question or answer content,
 * so a locked gate cannot leak a single character of the assessment. It offers
 * no continue-windowed path at the initial gate. After a live interview exits
 * fullscreen, its gate explicitly offers Back (re-enter) and Continue (accept
 * the windowed fallback); quiz does not pass that option.
 *
 * The copy is the only thing that ever differs between the two assessments, so
 * the translation namespace is a prop rather than the screen being duplicated.
 */
export function AssessmentFullscreenGateScreen({
  gate,
  keyPrefix,
  exitWarningKey,
  timerNoteKey,
  timerContinues = false,
  allowContinueWindowed = false,
}: {
  gate: AssessmentFullscreenGate;
  /** Namespace holding title/description/requesting/reenter/unsupported. */
  keyPrefix: string;
  /** Pluralised "we recorded this exit" key — lives in the take namespace. */
  exitWarningKey: string;
  /** "the clock keeps running" key, shown only when `timerContinues`. */
  timerNoteKey: string;
  timerContinues?: boolean;
  /**
   * True for interview only: after an unexpected exit, expose Back / Continue.
   * Quiz keeps the hard fullscreen gate and leaves this false.
   */
  allowContinueWindowed?: boolean;
}) {
  const { t } = useTranslation();
  const requesting = gate.requestState === "requesting";
  const denied = gate.requestState === "denied";
  const unsupported = gate.requestState === "unsupported" || !gate.supported;

  const notice = (text: string, Icon: typeof CircleAlert) => (
    <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span aria-live="polite">{text}</span>
    </p>
  );

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <ConfirmDialog
        open
        // Not dismissable: this is a mandatory gate, not a confirmation.
        // Escape / backdrop / Close never unlock it — only a granted
        // fullscreen request (or the session ending) does.
        onOpenChange={() => undefined}
        showCancel={false}
        isPending={requesting}
        title={t(
          allowContinueWindowed
            ? `${keyPrefix}.exit_title`
            : `${keyPrefix}.title`,
        )}
        description={t(
          allowContinueWindowed
            ? `${keyPrefix}.exit_description`
            : `${keyPrefix}.description`,
        )}
        extraContent={
          <>
            {unsupported
              ? notice(t(`${keyPrefix}.unsupported`), MonitorX)
              : null}
            {denied ? notice(t(`${keyPrefix}.denied`), CircleAlert) : null}
            {gate.exitCount > 0
              ? notice(
                  t(exitWarningKey, { count: gate.exitCount }),
                  CircleAlert,
                )
              : null}
            {timerContinues ? notice(t(timerNoteKey), CircleAlert) : null}
          </>
        }
        confirmLabel={
          <span className="flex items-center gap-2">
            {requesting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Maximize className="h-4 w-4" aria-hidden="true" />
            )}
            {requesting
              ? t(`${keyPrefix}.requesting`)
              : allowContinueWindowed
                ? t(`${keyPrefix}.continue_windowed`)
                : t(`${keyPrefix}.reenter`)}
          </span>
        }
        cancelLabel={allowContinueWindowed ? t(`${keyPrefix}.back`) : undefined}
        showCancel={allowContinueWindowed}
        onCancel={allowContinueWindowed ? () => void gate.enter() : undefined}
        onConfirm={() =>
          allowContinueWindowed ? gate.continueWindowed() : void gate.enter()
        }
      />
    </div>
  );
}
