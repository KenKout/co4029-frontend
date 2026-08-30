import { InterviewRoomProvider } from "@/components/interview/interview-room-provider";
import { interviewRoomProps } from "./_components/course-interview/agent-voice-presentation";
import { InterviewLobbyScreen } from "./_components/course-interview/InterviewLobbyScreen";
import { InterviewResultsScreen } from "./_components/course-interview/InterviewResultsScreen";
import {
  InterviewLoadingScreen,
  InterviewMissingConfigScreen,
} from "./_components/course-interview/InterviewStatusScreens";
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
 *
 * The screen is chosen into a variable rather than early-returned so that ONE
 * InterviewRoomProvider can wrap every branch. That is what lets a hybrid
 * session keep a single LiveKit room while the candidate moves between the
 * voice screen and the text workspace: an early return per branch would unmount
 * the provider on each switch and open a new room.
 */
export default function CourseInterviewPage() {
  const iv = useCourseInterview();
  const { course, config, finishResult, sessionId } = iv;

  // Whether this session should hold a live room right now. Every interview
  // is one native-agent room: typed turns ride `lk.chat`, speech rides the mic
  // toggle, so the room is wanted whenever a session exists and onboarding has
  // handed over to questioning.
  //
  // All five provider props come from interviewRoomProps (agent-voice-
  // presentation.ts). Two holds, documented there:
  //   - `pendingFirstQuestion` keeps the room down for ONE beat while the
  //     client narrates the server-authored transition line the agent never
  //     receives; the token is prefetched during that beat so the hold costs
  //     no dead air.
  //   - End/timer moves the phase to `closing` synchronously, before the
  //     finish API resolves, and that terminal state kills every capability:
  //     the room disconnects and RoomAudioRenderer unmounts, so in-flight
  //     agent audio cannot continue into the closing/result screen.
  const roomProps = interviewRoomProps({
    sessionId,
    phase: iv.phase,
    finishResult,
    onboardingStage: iv.onboardingStage,
    pendingFirstQuestion: iv.pendingFirstQuestion,
    micOn: iv.micOn,
  });

  const screen = (() => {
    // ── Loading state ────────────────────────────────────────────────────────
    if (iv.courseLoading || iv.configLoading) {
      return <InterviewLoadingScreen />;
    }

    if (!course || !config) {
      return <InterviewMissingConfigScreen slug={iv.slug} />;
    }

    // ── Results screen (text mode finish OR voice mode completion) ───────────
    if (finishResult) {
      return <InterviewResultsScreen iv={iv} finishResult={finishResult} />;
    }

    // ── Pre-start screen ──────────────────────────────────────────────────────
    if (!sessionId) {
      return <InterviewLobbyScreen iv={iv} course={course} config={config} />;
    }

    // ── Text mode chat UI ───────────────────────────────────────────────────
    return <InterviewWorkspaceScreen iv={iv} course={course} config={config} />;
  })();

  return (
    <InterviewRoomProvider
      sessionId={sessionId}
      active={roomProps.active}
      prefetch={roomProps.prefetch}
      warm={roomProps.warm}
      agentWanted={roomProps.agentWanted}
      audio={roomProps.audio}
    >
      {screen}
    </InterviewRoomProvider>
  );
}
