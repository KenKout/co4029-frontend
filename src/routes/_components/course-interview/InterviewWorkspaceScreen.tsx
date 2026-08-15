import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStartAudio, useVoiceAssistant } from "@livekit/components-react";
import { ConnectionState, DisconnectReason, RoomEvent } from "livekit-client";
import { toast } from "sonner";

import { EndInterviewDialog } from "@/components/interview/dialogs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ConnectionLostBanner,
  ErrorBanner,
} from "@/components/interview/error-banner";
import { useInterviewRoomState } from "@/components/interview/interview-room-provider";
import { InterviewProgressSteps } from "@/components/interview/interview-progress-steps";
import { InterviewHeader } from "@/components/interview/stages";
import { isResumedSessionTranscript } from "@/components/interview/stages/helpers";
import { useInterviewChat } from "@/components/interview/use-interview-chat";
import {
  resolveAgentOwnsTheVoice,
  resolveAgentVoicePhase,
} from "./agent-voice-presentation";
import { useAgentFailure } from "./use-agent-failure";
import {
  FullscreenDialogs,
  LeaveBlockerDialog,
} from "./InterviewSessionDialogs";
import type {
  CourseInterviewController,
  InterviewConfig,
  InterviewCourse,
} from "./use-course-interview";
import { useWorkspaceControllerBridge } from "./use-workspace-controller-bridge";
import { renderSubmissionSlot } from "./workspace-helpers";
import { WorkspaceInputArea } from "./WorkspaceInputArea";
import { WorkspaceStage } from "./WorkspaceStage";

/**
 * Text / hybrid mode chat UI — moved verbatim out of course-interview.tsx, with
 * the stage, the bottom input surface and the submission slot split into
 * siblings.
 */
export function InterviewWorkspaceScreen({
  iv,
  course,
  config,
}: {
  iv: CourseInterviewController;
  course: InterviewCourse;
  config: InterviewConfig;
}) {
  const { t } = useTranslation();
  const questioning = iv.phase === "questioning";
  // A restored transcript WITH real progress means this page load resumed an
  // in-progress session (refresh / voice-drop fallback). A brand-new session
  // also restores ceremony turns, so progress is the discriminator. Fired as a
  // toast once per page session; any turn appended after the restore makes the
  // condition false again, so it cannot repeat mid-conversation.
  const resumedToastShownRef = useRef(false);
  const sessionResumed = isResumedSessionTranscript(iv.transcript);
  useEffect(() => {
    if (resumedToastShownRef.current || !sessionResumed) return;
    resumedToastShownRef.current = true;
    toast(t("course_interview.recovery.resumed_title"), {
      description: t("course_interview.recovery.resumed_body"),
    });
  }, [sessionResumed, t]);

  // The LiveKit chat transport for typed turns. This screen is the only one
  // rendered INSIDE the room provider, so it is the only place the room is
  // reachable — mount the hook here and hand it to the turn handlers through the
  // controller's bridge ref (the actions are built outside the provider).
  //
  // `onSnapshot` is the session's whole state feed: the question it is on, the
  // countdown, progress, and whether it has finished. It is a callback rather
  // than an effect on `chat.snapshot` because two consecutive snapshots can carry
  // identical content and must each be applied in order.
  const { room, connecting, roomWanted, tokenError, retryToken } =
    useInterviewRoomState();
  const chat = useInterviewChat(room, { onSnapshot: iv.handleStateSnapshot });
  // The agent's own voice phase (`lk.agent.state`), published as a participant
  // attribute and surfaced here. This is the ONLY thing that knows when the
  // agent actually starts and stops speaking, and the workspace is the only
  // component inside the room provider — so it is read here and pushed into the
  // speech hook, same wiring as `setChatBridge` / `setRoomConnected`.
  const { agent, state: agentState } = useVoiceAssistant();
  // Render-phase write: the narration gate reads this ref synchronously when a
  // turn's AiTypingMessage mounts. The transition / first-question turn can
  // mount in the SAME commit the room handover starts, and its narrate() runs
  // in a child effect BEFORE this screen's effect would flip the state — so
  // the ref must be current during render, not after effects. (Ref write only;
  // the state flip stays in the effect below to drive the cancel + toggle.)
  //
  // `roomWanted`, not just `connecting`: the token prefetch means the token is
  // already in hand the instant `active` flips, so `connecting` is false while
  // the agent is still joining. That left the gate open for the whole join
  // window and the client narrated question one on top of the agent —
  // "phát ok rồi giữa chừng đứng lại rồi phát lại từ đầu". `roomWanted` is
  // false during the transition beat, so the client-only transition line is
  // still allowed through.
  // The room being connected is NOT the same as the agent owning the voice.
  //
  // A WARMED room (opened during setup so the worker startup overlaps
  // onboarding) is connected with nobody in it: the client is still the only
  // voice, and the setup ceremony lines are narrated client-side. Treating that
  // connection as a handover cut the greeting off mid-sentence — reported as
  // «đọc được "Hi Xà" xong dừng lại», session bd61e0f3: warm token at
  // 16:51:46.397, greeting fetched at 16:51:46.409 (17.8s of audio), then the
  // room finished connecting a beat later and cancelled it.
  //
  // `agentOwnsTheVoice` is therefore gated on onboarding being complete, which
  // is exactly when the agent is dispatched. Before that the room may be up,
  // but the client keeps the voice.
  const agentOwnsTheVoice = resolveAgentOwnsTheVoice({
    onboardingStage: iv.onboardingStage,
    roomWanted,
    connecting,
    chatConnected: chat.connected,
    pendingFirstQuestion: Boolean(iv.pendingFirstQuestion),
  });
  iv.setRoomConnectedRef(agentOwnsTheVoice);
  // Same value, second consumer: it tells the pacing coordinator an agent is
  // COMING, which `lk.agent.state` cannot say until the agent has already
  // joined (~10-13s later). Without it question one mounted with no reported
  // phase, took the "nothing will ever speak" fallback, and typed itself out
  // before the agent said a word.
  iv.setAgentExpected(agentOwnsTheVoice);

  // ── Agent failed to start ──────────────────────────────────────────────────
  // Two ways the voice can be dead: `lk.agent.state === "failed"` (worker
  // joined, then failed) or the join deadline passing with no participant at
  // all (worker unavailable, never dispatched — publishes no state, so time is
  // the only signal). Both surface the same toast, once.
  const { joinTimedOut } = useAgentFailure({
    expected: agentOwnsTheVoice,
    agentPresent: Boolean(agent),
    state: agentState,
  });

  // ── Room rejoin UX (migration step 4) ──────────────────────────────────────
  // The room is the only transport, so a drop while typing is a hard stop until
  // it recovers. Three distinct surfaces, because the recovery differs:
  //   token mint failed  → manual Rejoin re-mints the token
  //   signal reconnecting → the SDK owns recovery; reassure, do nothing
  //   room dropped        → manual Rejoin re-mints the token (a fresh join)
  // Event-driven rather than derived from `room.state` so the FIRST join can
  // never flash a "connection lost" banner while it is still connecting: the
  // `Disconnected` event only fires after a connection existed (or failed).
  const [roomDropped, setRoomDropped] = useState(false);
  useEffect(() => {
    if (!room) return;
    const onDisconnected = (reason?: DisconnectReason) => {
      if (reason !== DisconnectReason.CLIENT_INITIATED) setRoomDropped(true);
    };
    const onRecovered = () => setRoomDropped(false);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.Connected, onRecovered);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.Connected, onRecovered);
    };
  }, [room]);
  const roomState = room?.state;
  const signalReconnecting =
    roomState === ConnectionState.Reconnecting ||
    roomState === ConnectionState.SignalReconnecting;

  // ── Autoplay unlock ────────────────────────────────────────────────────────
  // Browsers block audio until a user gesture, and `RoomAudioRenderer` alone
  // gives the candidate no way to grant it — they would simply hear nothing and
  // have nothing to click. `useStartAudio` reports whether playback is allowed
  // and hands back the opener; the starter template ships the same affordance.
  //
  // This is NOT covered by the existing `startAudioWarmup`: that unlocks the
  // Web Audio context used by the REST narration path, not the agent's LiveKit
  // audio track.
  // `mergedProps` carries the onClick that performs the unlock AND a
  // `display: none` style once playback is allowed — so the button hides itself
  // and this does not need its own visibility logic. Spread it, as the starter
  // template does, rather than reaching for a bare `startAudio` (there isn't
  // one on this hook).
  const { mergedProps: startAudioProps, canPlayAudio } = useStartAudio({
    room,
    props: {},
  });
  // Auto-unlock on the candidate's FIRST gesture anywhere on the page. A
  // rejoined session already has context — a re-read is playing while the
  // "Enable audio" button waits for a click nobody remembers needing the first
  // time. The browser still requires a gesture, so the opener fires on the
  // first pointerdown/keydown (the button itself remains as the visible
  // fallback for a candidate who gestures nowhere near it).
  const audioUnlockRef = useRef<() => void>(() => undefined);
  audioUnlockRef.current = () => startAudioProps.onClick?.();
  useEffect(() => {
    if (!agentOwnsTheVoice || canPlayAudio) return;
    const unlock = () => audioUnlockRef.current();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [agentOwnsTheVoice, canPlayAudio]);
  // Same reason this is a render-phase write: a turn mounting in the handover
  // commit calls speak() from a child effect, and a phase delivered one effect
  // later would arrive after that turn already decided how to pace itself.
  //
  // `joinTimedOut` maps onto the same "failed" phase the coordinator already
  // drains on, so a turn mounting after the deadline releases its text
  // immediately instead of waiting out the 20s start timeout.
  iv.setAgentVoicePhase(
    joinTimedOut
      ? "failed"
      : resolveAgentVoicePhase(Boolean(agent), agentState),
  );
  useWorkspaceControllerBridge({ iv, chat, agentOwnsTheVoice });

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-white">
      <InterviewHeader
        slug={iv.slug}
        courseName={course.title}
        interviewTitle={config.title}
        elapsed={iv.elapsed}
        timerActive={iv.assessmentStartedAtMs !== null}
        assessmentStartedAtMs={iv.assessmentStartedAtMs}
        expectedDurationMinutes={config.time_limit_minutes}
        currentQuestion={questioning ? iv.currentQuestionNumber : null}
        totalQuestions={iv.totalQuestions}
        outcomeProgress={iv.outcomeProgress}
        questionElapsed={questioning ? iv.questionPacing.elapsedSeconds : null}
        questionLingering={iv.questionPacing.lingering}
        connected={iv.connected}
        voiceOn={iv.voiceOn}
        // When the LiveKit agent is live in the room it is the voice; the
        // client narration toggle cannot mute the room's audio track, so a
        // live toggle would lie. Same convention as the voice screen.
        showVoiceControl={!iv.roomConnected}
        onToggleVoice={() =>
          iv.setVoiceOn((current) => {
            if (current) iv.setAiSpeaking(false);
            return !current;
          })
        }
        onEndInterview={iv.openEndDialog}
        endInterviewDisabled={iv.endInterviewDisabled}
      />

      {/* Coarse step indicator: Setup → Interview → Completed (spec §4). */}
      <div className="shrink-0 border-b border-border bg-white/95">
        <div className="mx-auto flex max-w-[1120px] items-center justify-center px-3 py-2 sm:px-6">
          <InterviewProgressSteps current={iv.interviewStep} />
        </div>
      </div>

      {!iv.connected && (
        <div className="mx-auto w-full max-w-[840px] px-4 pt-3">
          <ConnectionLostBanner
            onRetry={() => iv.setConnected(navigator.onLine)}
          />
        </div>
      )}

      {roomWanted && tokenError && (
        <div className="mx-auto w-full max-w-[840px] px-4 pt-3">
          <ErrorBanner
            severity="error"
            title={t("course_interview.recovery.room_error_title")}
            description={t("course_interview.recovery.room_error_body")}
            reassurance={t("course_interview.recovery.progress_safe")}
            actions={[
              {
                label: t("course_interview.recovery.rejoin"),
                onClick: retryToken,
                primary: true,
              },
            ]}
          />
        </div>
      )}

      {!tokenError && roomDropped && (
        <div className="mx-auto w-full max-w-[840px] px-4 pt-3">
          <ConnectionLostBanner onRetry={retryToken} />
        </div>
      )}

      {!tokenError && !roomDropped && signalReconnecting && (
        <div className="mx-auto w-full max-w-[840px] px-4 pt-3">
          <ConnectionLostBanner reconnecting />
        </div>
      )}

      {/* Autoplay is blocked until the candidate gestures. A modal (not a
          passive banner) so a rejoined session cannot be mistaken for a silent
          one: the interviewer is already speaking — a re-read is playing —
          while the browser still waits for one click. The once-listener above
          unlocks on any first gesture; this is the visible affordance. */}
      <ConfirmDialog
        open={agentOwnsTheVoice && !canPlayAudio}
        // Not dismissable: without playback unlocked the candidate hears
        // nothing, and the once-listener only fires on a gesture anyway.
        onOpenChange={() => undefined}
        title={t("course_interview.enable_audio")}
        description={t("course_interview.enable_audio_body")}
        confirmLabel={t("course_interview.enable_audio")}
        onConfirm={() => startAudioProps.onClick?.()}
      />

      {/* One conversation surface. The stage below renders the question card and
          the full running transcript inline, so the docked side panel that used
          to sit here only duplicated what was already on screen — and duplicated
          it incompletely, since it never received the agent's live utterances. */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceStage
            iv={iv}
            submissionSlot={renderSubmissionSlot(iv)}
            agentActions={chat.agentActions}
          />
          {/* chat.pending from here, not iv.chatBridge: that is a ref. */}
          <WorkspaceInputArea
            iv={iv}
            chatPending={chat.pending}
            roomDown={roomWanted && !chat.connected}
          />
        </div>
      </div>

      <EndInterviewDialog
        open={iv.endDialogOpen}
        onOpenChange={(open) => {
          if (iv.finish.isPending && !open) return;
          iv.setEndDialogOpen(open);
        }}
        onConfirm={() => void iv.beginClosing("ended_early")}
        isPending={iv.finish.isPending}
      />
      <LeaveBlockerDialog iv={iv} />
      <FullscreenDialogs iv={iv} />
    </div>
  );
}
