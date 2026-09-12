import { AssessmentFullscreenGateScreen } from "@/components/assessment/AssessmentFullscreenGateScreen";
import type { AssessmentFullscreenGate } from "@/lib/hooks/useAssessmentFullscreenGate";

/**
 * The quiz's mandatory fullscreen gate: the shared assessment gate screen
 * bound to the quiz translation namespace. Rendered by both quiz routes IN
 * PLACE OF `QuizTakingStage` whenever an attempt is live but the browser is
 * not fullscreen (`session.fullscreen.requiredOpen`) — so the questions are
 * not merely covered by a dialog, they are not in the DOM at all.
 */
export function QuizFullscreenGateScreen({
  gate,
  timed,
}: {
  gate: AssessmentFullscreenGate;
  /** The quiz has a time limit, so the countdown runs on through the gate. */
  timed: boolean;
}) {
  return (
    <AssessmentFullscreenGateScreen
      gate={gate}
      keyPrefix="course_quiz.fullscreen_gate"
      exitWarningKey="course_quiz.fullscreen.exit_warning_recorded"
      timerNoteKey="course_quiz.fullscreen_timer_note.timer_continues"
      timerContinues={timed}
    />
  );
}
