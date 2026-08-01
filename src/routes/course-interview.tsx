import { InterviewLobbyScreen } from "./_components/course-interview/InterviewLobbyScreen";
import { InterviewResultsScreen } from "./_components/course-interview/InterviewResultsScreen";
import {
  InterviewLoadingScreen,
  InterviewMissingConfigScreen,
  InterviewPollingScreen,
} from "./_components/course-interview/InterviewStatusScreens";
import { InterviewVoiceScreen } from "./_components/course-interview/InterviewVoiceScreen";
import { InterviewWorkspaceScreen } from "./_components/course-interview/InterviewWorkspaceScreen";
import { useCourseInterview } from "./_components/course-interview/use-course-interview";

/**
 * Route: /courses/$slug/interview/$moduleId
 *
 * Data fetching, state and every handler live in useCourseInterview (see
 * _components/course-interview/use-course-interview.ts, which documents the
 * hook order this page depends on). This component only picks the screen for
 * the current phase — the branches below are in the same order, and test the
 * same conditions, as the sequence of early returns they replaced.
 */
export default function CourseInterviewPage() {
  const iv = useCourseInterview();
  const { course, config, finishResult, sessionId } = iv;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (iv.courseLoading || iv.configLoading) {
    return <InterviewLoadingScreen />;
  }

  if (!course || !config) {
    return <InterviewMissingConfigScreen slug={iv.slug} />;
  }

  // ── Results screen (text mode finish OR voice mode completion) ─────────────
  if (finishResult) {
    return <InterviewResultsScreen iv={iv} finishResult={finishResult} />;
  }

  // ── Polling / waiting for voice session to complete ────────────────────────
  if (iv.pollingCompletion) {
    return <InterviewPollingScreen />;
  }

  // ── Voice session active (LiveKit room) ────────────────────────────────────
  if (iv.voiceActive && sessionId) {
    return (
      <InterviewVoiceScreen
        iv={iv}
        course={course}
        config={config}
        sessionId={sessionId}
      />
    );
  }

  // ── Pre-start screen (mode selection) ─────────────────────────────────────
  if (!sessionId) {
    return <InterviewLobbyScreen iv={iv} course={course} config={config} />;
  }

  // ── Text mode chat UI ──────────────────────────────────────────────────────
  return <InterviewWorkspaceScreen iv={iv} course={course} config={config} />;
}
