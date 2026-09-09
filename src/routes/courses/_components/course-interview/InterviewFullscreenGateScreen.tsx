import { useTranslation } from "react-i18next";
import { CircleAlert, Loader2, Maximize, MonitorX } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CourseInterviewController } from "./use-course-interview";

/**
 * The MANDATORY fullscreen gate screen — rendered by BOTH routes in place of
 * the workspace whenever a live session exists but the browser is not
 * fullscreen (`iv.fullscreenGate.requiredOpen`).
 *
 * Deliberately neutral: it receives NO transcript, question or session
 * content, so a locked gate cannot leak a single character of the interview.
 * It offers no continue-windowed path — the only way forward is a granted
 * fullscreen request (the Re-enter button, a user gesture as browsers
 * require); leaving the interview happens through the normal leave flow
 * (nav/back, which the leave blocker still intercepts). Escape and backdrop
 * clicks are ignored: ConfirmDialog's alert-dialog primitive only closes via
 * `onOpenChange`, which we no-op here.
 */
export function InterviewFullscreenGateScreen({
  iv,
}: {
  iv: CourseInterviewController;
}) {
  const { t } = useTranslation();
  const gate = iv.fullscreenGate;
  const requesting = gate.requestState === "requesting";
  const denied = gate.requestState === "denied";
  const unsupported = gate.requestState === "unsupported" || !gate.supported;
  // For a graded attempt the server clock keeps running while the candidate
  // sits on this screen — the gate must say so, or the wait reads as a pause.
  const timerContinues = iv.assessmentStartedAtMs !== null;
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
        title={t("course_interview.fullscreen_gate.title")}
        description={t("course_interview.fullscreen_gate.description")}
        extraContent={
          <>
            {unsupported ? (
              <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900">
                <MonitorX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span aria-live="polite">
                  {t("course_interview.fullscreen_gate.unsupported")}
                </span>
              </p>
            ) : null}
            {denied ? (
              <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span aria-live="polite">
                  {t("course_interview.fullscreen_gate.denied")}
                </span>
              </p>
            ) : null}
            {gate.exitCount > 0 ? (
              <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span aria-live="polite">
                  {t("course_interview.fullscreen.exit_warning_recorded", {
                    count: gate.exitCount,
                  })}
                </span>
              </p>
            ) : null}
            {timerContinues ? (
              <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span aria-live="polite">
                  {t("course_interview.fullscreen_timer_note.timer_continues")}
                </span>
              </p>
            ) : null}
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
              ? t("course_interview.fullscreen_gate.requesting")
              : t("course_interview.fullscreen_gate.reenter")}
          </span>
        }
        onConfirm={() => void gate.enter()}
      />
    </div>
  );
}
