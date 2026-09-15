import { AssessmentFullscreenGateScreen } from "@/components/assessment/AssessmentFullscreenGateScreen";
import type { CourseInterviewController } from "./use-course-interview";

/**
 * The interview's mandatory fullscreen gate: the shared assessment gate screen
 * bound to the interview's controller and translation namespace. Rendered by
 * BOTH interview routes in place of the workspace whenever a live session
 * exists but the browser is not fullscreen (`iv.fullscreenGate.requiredOpen`).
 */
export function InterviewFullscreenGateScreen({
  iv,
}: {
  iv: CourseInterviewController;
}) {
  return (
    <AssessmentFullscreenGateScreen
      gate={iv.fullscreenGate}
      keyPrefix="course_interview.fullscreen_gate"
      exitWarningKey="course_interview.fullscreen.exit_warning_recorded"
      timerNoteKey="course_interview.fullscreen_timer_note.timer_continues"
      // For a graded attempt the server clock keeps running while the
      // candidate sits on this screen.
      timerContinues={iv.assessmentStartedAtMs !== null}
    />
  );
}
