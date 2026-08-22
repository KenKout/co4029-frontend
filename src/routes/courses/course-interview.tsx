import { InterviewRoomProvider } from "@/components/interview/interview-room-provider";
import { shouldWarmRoom } from "./_components/course-interview/agent-voice-presentation";
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
  // `pendingFirstQuestion` holds the room back for ONE beat. When onboarding
  // completes the client narrates the server-authored transition line the
  // agent never receives (see use-interview-speech for the narration gate).
  // The flag is cleared by handleTurnPresented the instant that beat ends.
  const roomActive =
    Boolean(sessionId) &&
    iv.onboardingStage === "completed" &&
    !iv.pendingFirstQuestion;

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
      active={roomActive}
      // Mint the token during the transition beat so the room can connect the
      // instant the beat ends — the hold above must not cost dead air before
      // question one.
      prefetch={Boolean(sessionId) && iv.onboardingStage === "completed"}
      // Open the room DURING setup, so the ~10-13s LiveKit worker startup
      // overlaps the onboarding the candidate is doing anyway rather than
      // sitting in front of question one as dead air. The warm token carries no
      // agent dispatch, so nothing can start speaking early.
      // Keep the room warm through the transition beat too, not just during
      // onboarding. `roomActive` is deliberately false while
      // `pendingFirstQuestion` holds (so the client can voice the transition
      // line the agent never receives) — but if `warm` also went false there,
      // `connect` would drop and re-establish the WebRTC session in the middle
      // of that very utterance. The teardown re-idles the audio output route and
      // clips its first syllables: reported as «bị voice thiếu 2 3 chữ đầu
      // (nhưng sau đó đọc tiếp đúng nhịp)».
      //
      // Warming past onboarding is otherwise a no-op: the provider only mints a
      // warm (non-dispatching) token while nothing else wants a real room, and
      // by now `agentWanted` has already dispatched the interviewer.
      warm={shouldWarmRoom({
        sessionId,
        onboardingStage: iv.onboardingStage,
        pendingFirstQuestion: Boolean(iv.pendingFirstQuestion),
      })}
      // ...and send the interviewer in the moment setup is done. Only acts on a
      // room that was actually warmed; a normally-minted token already carries
      // its dispatch.
      agentWanted={
        Boolean(sessionId) && iv.onboardingStage === "completed"
      }
      // Publish the mic only while the candidate has toggled it on. OFF for a
      // typing candidate: the room stays open (so `lk.chat` has a connection)
      // but nothing is captured until they ask to speak.
      audio={iv.micOn}
    >
      {screen}
    </InterviewRoomProvider>
  );
}
