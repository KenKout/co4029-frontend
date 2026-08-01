/**
 * Voice interview call controls. Must be rendered inside LiveKitRoom.
 */
import { useEffect, useRef, useState } from "react";
import { useTrackToggle, useVoiceAssistant } from "@livekit/components-react";
import { Track } from "livekit-client";

import { VoiceStatusIndicator } from "@/components/interview/conversation";
import { EndInterviewDialog } from "@/components/interview/dialogs";
import {
  ElapsedBadge,
  EndInterviewButton,
  FinishAnswerButton,
  MicToggleButton,
} from "@/components/interview/voice-controls/call-buttons";
import { useElapsedTimer } from "@/components/interview/voice-controls/use-elapsed-timer";
import { resolveInterviewState } from "@/lib/interview/format";
import type { InterviewAgentStatus } from "@/lib/interview/types";

interface VoiceControlsProps {
  onEndInterview: () => void;
  isEnding?: boolean;
  elapsed?: string;
}

export function VoiceControls({
  onEndInterview,
  isEnding = false,
  elapsed: elapsedProp,
}: VoiceControlsProps) {
  const [micError, setMicError] = useState(false);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [finishingAnswer, setFinishingAnswer] = useState(false);
  const finishObservedProcessingRef = useRef(false);
  const {
    toggle,
    enabled: micEnabled,
    pending: micPending,
  } = useTrackToggle({
    source: Track.Source.Microphone,
    onDeviceError: () => setMicError(true),
  });
  const { state: agentState } = useVoiceAssistant();
  const fallbackElapsed = useElapsedTimer();
  const elapsed = elapsedProp ?? fallbackElapsed;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const status: InterviewAgentStatus = resolveInterviewState({
    hasError: micError,
    thinking:
      agentState === "thinking" ||
      (finishingAnswer && agentState !== "speaking"),
    speaking: agentState === "speaking",
    listening: agentState === "listening" && micEnabled,
    paused: pausedByUser,
  });

  useEffect(() => {
    if (!finishingAnswer) {
      finishObservedProcessingRef.current = false;
      return;
    }
    if (agentState !== "listening") {
      finishObservedProcessingRef.current = true;
      return;
    }
    if (finishObservedProcessingRef.current) {
      void toggle(true).finally(() => setFinishingAnswer(false));
    }
  }, [agentState, finishingAnswer, toggle]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <VoiceStatusIndicator
          status={status}
          className="min-w-[12rem] flex-1"
          message={
            micError
              ? "Microphone access failed. Your interview is still connected."
              : undefined
          }
          onRetry={
            micError
              ? () => {
                  setMicError(false);
                  void toggle(true).catch(() => setMicError(true));
                }
              : undefined
          }
        />

        <MicToggleButton
          micEnabled={micEnabled}
          micPending={micPending}
          finishingAnswer={finishingAnswer}
          agentSpeaking={agentState === "speaking"}
          pausedByUser={pausedByUser}
          toggle={toggle}
          onPausedByUserChange={setPausedByUser}
          onMicErrorChange={setMicError}
        />

        <FinishAnswerButton
          micEnabled={micEnabled}
          micPending={micPending}
          finishingAnswer={finishingAnswer}
          agentSpeaking={agentState === "speaking"}
          toggle={toggle}
          onPausedByUserChange={setPausedByUser}
          onFinishingAnswerChange={setFinishingAnswer}
        />

        <ElapsedBadge elapsed={elapsed} />

        <EndInterviewButton
          isEnding={isEnding}
          onRequestEnd={() => setConfirmOpen(true)}
        />
      </div>

      <EndInterviewDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (isEnding && !open) return;
          setConfirmOpen(open);
        }}
        onConfirm={onEndInterview}
        isPending={isEnding}
      />
    </>
  );
}
