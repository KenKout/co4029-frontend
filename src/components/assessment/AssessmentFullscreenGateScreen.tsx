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
 * no continue-windowed path — the only way forward is a granted fullscreen
 * request (the Re-enter button, a user gesture as browsers require); leaving
 * happens through the normal leave flow (nav/back, which the leave blocker
 * still intercepts). Escape and backdrop clicks are ignored: ConfirmDialog's
 * alert-dialog primitive only closes via `onOpenChange`, which we no-op here.
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
}: {
  gate: AssessmentFullscreenGate;
  /** Namespace holding title/description/requesting/reenter/denied/unsupported. */
  keyPrefix: string;
  /** Pluralised "we recorded this exit" key — lives in the take namespace. */
  exitWarningKey: string;
  /** "the clock keeps running" key, shown only when `timerContinues`. */
  timerNoteKey: string;
  /**
   * True when a server-side clock keeps running while the participant sits on
   * this screen. The gate must say so, or the wait reads as a pause.
   */
  timerContinues?: boolean;
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
        title={t(`${keyPrefix}.title`)}
        description={t(`${keyPrefix}.description`)}
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
              : t(`${keyPrefix}.reenter`)}
          </span>
        }
        onConfirm={() => void gate.enter()}
      />
    </div>
  );
}
