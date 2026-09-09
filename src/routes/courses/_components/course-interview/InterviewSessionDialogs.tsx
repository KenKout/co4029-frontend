import {
  LeaveInterviewDialog,
} from "@/components/interview/dialogs";
import type { CourseInterviewController } from "./use-course-interview";

/**
 * The navigation-blocker dialog, moved verbatim out of course-interview.tsx.
 *
 * The fullscreen consent + exit-warning pair that used to live here is GONE:
 * fullscreen is now a mandatory gate. The route renders
 * `InterviewFullscreenGateScreen` whenever a live session is not fullscreen,
 * and re-entry happens through that screen's Re-enter button — not through
 * dismissable dialogs inside the workspace (the workspace unmounts entirely
 * when the gate locks).
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
