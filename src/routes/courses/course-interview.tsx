import { InterviewRoomProvider } from "@/components/interview/interview-room-provider";
import type { InterviewCourse, InterviewConfig } from "./_components/course-interview/use-course-interview";
import { interviewRoomProps } from "./_components/course-interview/agent-voice-presentation";
import { InterviewFullscreenGateScreen } from "./_components/course-interview/InterviewFullscreenGateScreen";
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
 *
 * Screen order (shared with the curriculum route's InterviewProxyInner — see
 * resolveInterviewScreen): results beat the gate so a timed-out / finished
 * session always unlocks into the verdict; a live session without fullscreen
 * renders the mandatory gate INSTEAD of the workspace, which unmounts
 * completely (no transcript, no typing animation, no audio) until re-entry.
 */
export default function CourseInterviewPage() {
  const iv = useCourseInterview();
  const { course, config, finishResult, sessionId } = iv;

  // Whether this session should hold a live room right now. Every interview
  // is one native-agent room: typed turns ride `lk.chat`, speech rides the mic
  // toggle, so the room is wanted whenever a session exists and onboarding has
  // handed over to questioning — and ONLY while the mandatory fullscreen gate
  // is granted; an unexpected exit drops every capability to false at once.
  //
  // All five provider props come from interviewRoomProps (agent-voice-
  // presentation.ts). Three holds, documented there:
  //   - `fullscreenGranted` (the gate): no fullscreen → all five props false,
  //     so the client disconnects, drops the mic and stops warm/dispatch.
  //   - `pendingFirstQuestion` keeps the room down for ONE beat while the
  //     client narrates the server-authored transition line the agent never
  //     receives; the token is prefetched during that beat so the hold costs
  //     no dead air.
  //   - End/timer moves the phase to `closing` synchronously (with
  //     `closingReason` set), before the finish API resolves, and that
  //     terminal state kills every capability: the room disconnects and
  //     RoomAudioRenderer unmounts, so in-flight agent audio cannot continue
  //     into the closing/result screen. The ONE exception is a `natural`
  //     closing — the agent is already speaking the goodbye over LiveKit, so
  //     the room stays live until the farewell presents and the phase
  //     advances to results.
  const roomProps = interviewRoomProps({
    sessionId,
    phase: iv.phase,
    finishResult,
    closingReason: iv.closingReason,
    onboardingStage: iv.onboardingStage,
    pendingFirstQuestion: iv.pendingFirstQuestion,
    micOn: iv.micOn,
    fullscreenGranted: iv.fullscreenGate.isFullscreen,
  });

  const screen = resolveInterviewScreen({
    iv,
    course: course!,
    config: config!,
    finishResult,
    sessionId,
  });

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

/**
 * The shared screen-selection order for BOTH routes (this page and the
 * curriculum route's InterviewProxyInner). One implementation, not two
 * near-copies, so the gate cannot be bypassed by taking the other URL.
 */
export function resolveInterviewScreen(args: {
  iv: ReturnType<typeof useCourseInterview>;
  course: InterviewCourse;
  config: InterviewConfig;
  finishResult: ReturnType<typeof useCourseInterview>["finishResult"];
  sessionId: ReturnType<typeof useCourseInterview>["sessionId"];
}): React.ReactNode {
  const { iv, course, config, finishResult, sessionId } = args;

  // ── Loading state ────────────────────────────────────────────────────────
  if (iv.courseLoading || iv.configLoading) {
    return <InterviewLoadingScreen />;
  }

  if (!course || !config) {
    return <InterviewMissingConfigScreen slug={iv.slug} />;
  }

  // ── Results screen (BEFORE the gate: timeout/finish must always unlock) ──
  if (finishResult) {
    return <InterviewResultsScreen iv={iv} finishResult={finishResult} />;
  }

  // ── Pre-start screen (lobby + mandatory start dialog) ────────────────────
  if (!sessionId) {
    return <InterviewLobbyScreen iv={iv} course={course} config={config} />;
  }

  // ── Live session without fullscreen → the mandatory gate, INSTEAD of the
  //    workspace. Nothing of the session renders here: no transcript, no
  //    question, no composer, no AiTypingMessage, no audio.
  if (iv.fullscreenGate.requiredOpen) {
    return <InterviewFullscreenGateScreen iv={iv} />;
  }

  // ── Text mode chat UI ────────────────────────────────────────────────────
  return <InterviewWorkspaceScreen iv={iv} course={course} config={config} />;
}
