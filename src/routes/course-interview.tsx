import { InterviewRoomProvider } from "@/components/interview/interview-room-provider";
import { livekitTextEnabled } from "@/lib/interview/text-transport";
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

  // Whether this session should hold a live room right now.
  //
  // `voiceActive` alone reproduces the previous behaviour exactly (the room used
  // to exist precisely while the voice screen was mounted). The hybrid clause is
  // additive and gated by the flag, so with the flag off this is unchanged.
  //
  // `pendingFirstQuestion` holds the room back for ONE beat. When onboarding
  // completes the server sends a transition line ("Great — the introduction is
  // complete. Let's begin. Here is your first question."). That line exists
  // ONLY on the REST/client side: the agent never receives it, so only the
  // client narration can voice it. Bringing the room up immediately silenced
  // it (the narration gate mutes the client the moment the room is live), and
  // the candidate then heard nothing until the agent joined and read its intro
  // plus question one back to back — the reported "doesn't read it, then
  // delays and reads it together with question 1".
  //
  // The flag is cleared by handleTurnPresented the instant the transition has
  // finished presenting, so the room comes up one beat later and the agent
  // still owns question one. The token prefetch is unaffected (the provider
  // fetches on `active`), so this costs the handover nothing but the beat.
  const roomActive =
    Boolean(sessionId) &&
    (iv.voiceActive ||
      (livekitTextEnabled() &&
        iv.inputMode === "hybrid" &&
        iv.onboardingStage === "completed" &&
        !iv.pendingFirstQuestion));

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

    // ── Polling / waiting for voice session to complete ──────────────────────
    if (iv.pollingCompletion) {
      return <InterviewPollingScreen />;
    }

    // ── Voice session active (LiveKit room) ──────────────────────────────────
    if (iv.voiceActive && sessionId) {
      return <InterviewVoiceScreen iv={iv} course={course} config={config} />;
    }

    // ── Pre-start screen (mode selection) ───────────────────────────────────
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
      prefetch={
        Boolean(sessionId) &&
        livekitTextEnabled() &&
        iv.inputMode === "hybrid" &&
        iv.onboardingStage === "completed"
      }
      // Open the room DURING setup, so the ~10-13s LiveKit worker startup
      // overlaps the onboarding the candidate is doing anyway rather than
      // sitting in front of question one as dead air. The warm token carries no
      // agent dispatch, so nothing can start speaking early.
      warm={
        Boolean(sessionId) &&
        (iv.inputMode === "hybrid" || iv.inputMode === "voice") &&
        iv.onboardingStage !== "completed"
      }
      // ...and send the interviewer in the moment setup is done. Only acts on a
      // room that was actually warmed; a normally-minted token already carries
      // its dispatch.
      agentWanted={
        Boolean(sessionId) && iv.onboardingStage === "completed"
      }
      // Publish the mic only on the voice screen. A hybrid candidate who is
      // typing holds the room open (so `lk.chat` has a connection) but must not
      // have their microphone captured.
      audio={iv.voiceActive}
      // Only treat a drop as a voice failure while the candidate is actually in
      // the voice room. A drop while they are typing is recoverable on its own:
      // the text transport falls back to REST, so tearing the session down to
      // text mode (and toasting about voice) would be wrong there.
      onUnexpectedDisconnect={
        iv.voiceActive
          ? () => {
              void iv.handleVoiceDropped();
            }
          : undefined
      }
    >
      {screen}
    </InterviewRoomProvider>
  );
}
