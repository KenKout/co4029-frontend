import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useVoiceAssistant } from "@livekit/components-react";
import { ListChecks } from "lucide-react";

import { EndInterviewDialog } from "@/components/interview/dialogs";
import { ConnectionLostBanner } from "@/components/interview/error-banner";
import { useInterviewRoomState } from "@/components/interview/interview-room-provider";
import { InterviewProgressSteps } from "@/components/interview/interview-progress-steps";
import { InterviewHeader } from "@/components/interview/stages";
import { TranscriptPanel } from "@/components/interview/transcript";
import { useInterviewChat } from "@/components/interview/use-interview-chat";
import { livekitTextEnabled } from "@/lib/interview/text-transport";
import { questionTypeLabel } from "@/lib/interview/turn-factory";
import { resolveAgentVoicePhase } from "./agent-voice-presentation";
import {
  FullscreenDialogs,
  LeaveBlockerDialog,
} from "./InterviewSessionDialogs";
import type {
  CourseInterviewController,
  InterviewConfig,
  InterviewCourse,
} from "./use-course-interview";
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

  // The LiveKit chat transport for typed turns. This screen is the only one
  // rendered INSIDE the room provider, so it is the only place the room is
  // reachable — mount the hook here and hand it to `handleRespond` through the
  // controller's bridge ref (the actions are built outside the provider).
  // Flag off → enabled false → canSend/connected stay false and the transport
  // resolver picks REST, so nothing else changes.
  const { room, connecting, roomWanted } = useInterviewRoomState();
  const chat = useInterviewChat(room, { enabled: livekitTextEnabled() });
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
  const agentOwnsTheVoice = roomWanted || connecting || chat.connected;
  iv.setRoomConnectedRef(agentOwnsTheVoice);
  // Same reason this is a render-phase write: a turn mounting in the handover
  // commit calls speak() from a child effect, and a phase delivered one effect
  // later would arrive after that turn already decided how to pace itself.
  iv.setAgentVoicePhase(resolveAgentVoicePhase(Boolean(agent), agentState));
  // Hand the hook to `handleRespond` through the controller's bridge setter
  // (the actions are built outside the provider, where the room is not
  // reachable). The setter, not a direct ref write, so the immutability rule
  // never sees a prop mutation.
  const { setChatBridge, setRoomConnected } = iv;
  useEffect(() => {
    setChatBridge(chat);
    // The agent in the room speaks every utterance via LiveKit TTS; the
    // workspace must not narrate the same text client-side (double voice).
    // Same predicate as the render-phase write above, so the state that drives
    // the cancel-on-handover and the voice toggle can never disagree with the
    // ref the gate actually reads.
    setRoomConnected(agentOwnsTheVoice);
    return () => {
      setChatBridge(null);
      setRoomConnected(false);
    };
  }, [setChatBridge, setRoomConnected, agentOwnsTheVoice, chat]);

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

      {/* Persistent, not dismissible. The stakes of the run are the one thing a
          student must never be uncertain about mid-interview, and a toast at
          start would be long gone by the time it mattered. */}
      {iv.sessionMode === "practice" && (
        <div
          className="shrink-0 border-b border-m3-outline-variant/40 bg-m3-primary-fixed"
          role="status"
        >
          <div className="mx-auto flex max-w-[1120px] items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-m3-primary sm:px-6">
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            {t("course_interview.mode.banner")}
          </div>
        </div>
      )}

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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceStage iv={iv} submissionSlot={renderSubmissionSlot(iv)} />
          <WorkspaceInputArea iv={iv} />
        </div>

        <TranscriptPanel
          open={iv.transcriptOpen}
          onClose={() => iv.setTranscriptOpen(false)}
          transcript={iv.transcript}
          presentedAiTurnIds={iv.presentedAiTurnIds}
          questionTypeLabel={(type) => questionTypeLabel(type, t)}
          speak={iv.speakIfOn}
          onSpeakingChange={(speaking) => {
            iv.setAiSpeaking(iv.voiceOn && speaking);
            iv.setAiPresenting(speaking);
          }}
          onReplay={(turn) => void iv.replayIfOn(turn.text)}
          replayDisabled={!iv.voiceOn}
          replayingTurnId={null}
        />
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
