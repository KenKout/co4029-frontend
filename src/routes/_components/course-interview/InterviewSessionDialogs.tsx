import {
  FullscreenExitWarningDialog,
  FullscreenPromptDialog,
  LeaveInterviewDialog,
} from "@/components/interview/dialogs";
import type { CourseInterviewController } from "./use-course-interview";

/**
 * The navigation-blocker and fullscreen-proctoring dialogs, moved verbatim out
 * of course-interview.tsx where they were two JSX consts reused by the voice
 * room and the text/hybrid workspace.
 */

export function LeaveBlockerDialog({ iv }: { iv: CourseInterviewController }) {
  return (
    <LeaveInterviewDialog
      open={iv.leaveBlocker.status === "blocked"}
      onStay={iv.stayInInterview}
      onLeave={iv.leaveInterviewOpen}
      assessmentStarted={iv.assessmentStartedAtMs !== null}
      hasTimeLimit={Boolean(iv.config?.time_limit_minutes)}
    />
  );
}

/**
 * Fullscreen consent + exit-warning dialogs. Rendered in every live-session
 * branch (text/hybrid workspace and the LiveKit voice room) so the proctoring
 * behaviour is identical across modes.
 */
export function FullscreenDialogs({ iv }: { iv: CourseInterviewController }) {
  const { fullscreenDeterrent } = iv;
  return (
    <>
      <FullscreenPromptDialog
        open={fullscreenDeterrent.promptOpen}
        onConfirm={fullscreenDeterrent.acceptPrompt}
        onDecline={fullscreenDeterrent.declinePrompt}
      />
      <FullscreenExitWarningDialog
        open={fullscreenDeterrent.warningOpen}
        exitCount={fullscreenDeterrent.exitCount}
        onReenter={fullscreenDeterrent.reenter}
        onDismiss={fullscreenDeterrent.dismissWarning}
      />
    </>
  );
}
