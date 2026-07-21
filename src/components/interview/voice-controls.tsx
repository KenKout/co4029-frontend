/**
 * Voice interview call controls. Must be rendered inside LiveKitRoom.
 */
import { useEffect, useRef, useState } from "react";
import { useTrackToggle, useVoiceAssistant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Check, Clock3, Pause, PhoneOff, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  EndInterviewDialog,
  VoiceStatusIndicator,
  type InterviewAgentStatus,
  resolveInterviewState,
} from "./interview-workspace";

interface VoiceControlsProps {
  onEndInterview: () => void;
  isEnding?: boolean;
  elapsed?: string;
}

function useElapsedTimer() {
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
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
          message={micError ? "Microphone access failed. Your interview is still connected." : undefined}
          onRetry={
            micError
              ? () => {
                  setMicError(false);
                  void toggle(true).catch(() => setMicError(true));
                }
              : undefined
          }
        />

        {micEnabled ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              setPausedByUser(true);
              void toggle(false);
            }}
            disabled={micPending || finishingAnswer || agentState === "speaking"}
            className="min-h-11"
          >
            <Pause className="h-4 w-4" />
            <span className="hidden sm:inline">Pause</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              setPausedByUser(false);
              setMicError(false);
              void toggle(true).catch(() => setMicError(true));
            }}
            disabled={micPending || finishingAnswer || agentState === "speaking"}
            className="min-h-11"
          >
            {micPending ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span className="hidden sm:inline">{pausedByUser ? "Resume" : "Start answering"}</span>
          </Button>
        )}

        <Button
          type="button"
          size="lg"
          onClick={() => {
            setPausedByUser(false);
            setFinishingAnswer(true);
            void toggle(false);
          }}
          disabled={!micEnabled || micPending || finishingAnswer || agentState === "speaking"}
          className="min-h-11"
        >
          <Check className="h-4 w-4" />
          <span className="hidden sm:inline">Finish answer</span>
        </Button>

        <span className="ml-auto inline-flex items-center gap-1.5 px-1 font-mono text-xs font-semibold tabular-nums text-text-muted sm:px-2">
          <Clock3 className="hidden h-3.5 w-3.5 sm:block" />
          {elapsed}
        </span>

        <Button
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
          disabled={isEnding}
          className="min-h-11 rounded-lg px-3 font-semibold text-danger hover:bg-danger/10"
          aria-label="End interview"
          title="End interview"
        >
          <PhoneOff className="h-4 w-4" />
          <span className="hidden sm:inline">{isEnding ? "Ending…" : "End interview"}</span>
        </Button>
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
