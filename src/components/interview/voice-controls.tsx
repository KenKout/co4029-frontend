/**
 * Voice interview call controls. Must be rendered inside LiveKitRoom.
 */
import { useEffect, useRef, useState } from "react";
import { useTrackToggle, useVoiceAssistant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Clock3, Mic, MicOff, PhoneOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  EndInterviewDialog,
  VoiceStatusIndicator,
  type InterviewAgentStatus,
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
  const { buttonProps, enabled: micEnabled } = useTrackToggle({
    source: Track.Source.Microphone,
  });
  const { state: agentState } = useVoiceAssistant();
  const fallbackElapsed = useElapsedTimer();
  const elapsed = elapsedProp ?? fallbackElapsed;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const status: InterviewAgentStatus =
    agentState === "speaking"
      ? "speaking"
      : agentState === "listening"
        ? "listening"
        : agentState === "thinking"
          ? "processing"
          : "idle";

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          {...buttonProps}
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-lg border text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60",
            micEnabled
              ? "border-primary/20 bg-primary-soft text-primary hover:bg-primary-soft-dim"
              : "border-danger/20 bg-danger/10 text-danger hover:bg-danger/15",
          )}
          aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
          aria-pressed={micEnabled}
          title={micEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </button>

        <VoiceStatusIndicator status={status} className="min-w-0 flex-1" />

        <span className="ml-auto inline-flex items-center gap-1.5 px-1 font-mono text-xs font-semibold tabular-nums text-text-muted sm:px-2">
          <Clock3 className="hidden h-3.5 w-3.5 sm:block" />
          {elapsed}
        </span>

        <Button
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
          disabled={isEnding}
          className="h-10 rounded-lg px-3 font-semibold text-danger hover:bg-danger/10"
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
