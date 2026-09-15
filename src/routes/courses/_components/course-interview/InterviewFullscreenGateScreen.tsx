import { AssessmentFullscreenGateScreen } from "@/components/assessment/AssessmentFullscreenGateScreen";
import type { CourseInterviewController } from "./use-course-interview";
import { InterviewExitConfirmDialog } from "./InterviewExitConfirmDialog";

/**
 * The interview's mandatory fullscreen gate: the shared assessment gate screen
 * bound to the interview's controller and translation namespace. Rendered by
 * BOTH interview routes in place of the workspace whenever a live session
 * exists but the browser is not fullscreen (`iv.fullscreenGate.requiredOpen`).
 *
 * On top of the shared gate, the interview layers the accidental-exit
 * confirmation: as soon as an unexpected exit is pending (Escape mid-session)
 * a Back / Continue dialog asks what the exit meant. Back re-enters fullscreen
 * and the held integrity event is dropped; Continue accepts the windowed
 * interview and the event is scored (+the config's fullscreen_exit points).
 */
export function InterviewFullscreenGateScreen({
  iv,
}: {
  iv: CourseInterviewController;
}) {
  const { fullscreenGate: gate, config, resolveHeldFullscreenExit } = iv;
  const exitPoints = config?.integrity_weight_fullscreen_exit ?? 3;

  const settleAndReenter = () => {
    // Back = accidental, not scored: drop the held event, then re-enter.
    gate.resolveExit(false);
    resolveHeldFullscreenExit(false);
    void gate.enter();
  };
  const settleAndContinue = () => {
    // Continue = deliberate windowed exit: the held event is recorded.
    gate.resolveExit(true);
    resolveHeldFullscreenExit(true);
  };

  return (
    <>
      <AssessmentFullscreenGateScreen
        gate={gate}
        keyPrefix="course_interview.fullscreen_gate"
        exitWarningKey="course_interview.fullscreen.exit_warning_recorded"
        timerNoteKey="course_interview.fullscreen_timer_note.timer_continues"
        // For a graded attempt the server clock keeps running while the
        // candidate sits on this screen.
        timerContinues={iv.assessmentStartedAtMs !== null}
      />
      <InterviewExitConfirmDialog
        open={gate.pendingExit}
        exitPoints={exitPoints}
        onBack={settleAndReenter}
        onContinue={settleAndContinue}
      />
    </>
  );
}
