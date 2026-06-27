/**
 * Voice interview controls: mic mute/unmute, AI speaking/listening indicator,
 * elapsed timer, and "End interview" button.
 * Must be rendered inside a <LiveKitRoom> context.
 */
import { useEffect, useRef, useState } from "react";
import { useTrackToggle, useVoiceAssistant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceControlsProps {
  onEndInterview: () => void;
  isEnding?: boolean;
}

function useElapsedTimer() {
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function VoiceControls({ onEndInterview, isEnding = false }: VoiceControlsProps) {
  const { buttonProps, enabled: micEnabled } = useTrackToggle({
    source: Track.Source.Microphone,
  });
  const { state: agentState } = useVoiceAssistant();
  const elapsed = useElapsedTimer();

  const isSpeaking = agentState === "speaking";
  const isListening = agentState === "listening";
  const isThinking = agentState === "thinking";

  const agentLabel = isSpeaking
    ? "AI is speaking…"
    : isListening
      ? "Listening…"
      : isThinking
        ? "AI is thinking…"
        : "Connecting…";

  return (
    <div className="flex flex-col gap-4">
      {/* Agent status indicator */}
      <div className="flex items-center justify-center gap-2 text-sm font-medium text-m3-on-surface-variant">
        <span
          className={cn(
            "w-2.5 h-2.5 rounded-full shrink-0",
            isSpeaking && "bg-m3-primary animate-pulse",
            isListening && "bg-emerald-500 animate-pulse",
            isThinking && "bg-amber-400 animate-pulse",
            !isSpeaking && !isListening && !isThinking && "bg-m3-outline-variant",
          )}
        />
        {isSpeaking && <Volume2 className="h-4 w-4 text-m3-primary" />}
        <span>{agentLabel}</span>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Elapsed timer */}
        <span className="text-xs font-mono text-m3-outline tabular-nums">
          {elapsed}
        </span>

        {/* Mic toggle */}
        <button
          {...buttonProps}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all",
            micEnabled
              ? "bg-m3-surface-container text-m3-on-surface hover:bg-m3-surface-container-high"
              : "bg-red-100 text-red-600 hover:bg-red-200",
          )}
          title={micEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {micEnabled ? (
            <Mic className="h-4 w-4" />
          ) : (
            <MicOff className="h-4 w-4" />
          )}
          {micEnabled ? "Mute" : "Unmuted"}
        </button>

        {/* End interview */}
        <Button
          variant="outline"
          onClick={onEndInterview}
          disabled={isEnding}
          className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold gap-2 text-sm"
        >
          <PhoneOff className="h-4 w-4" />
          {isEnding ? "Ending…" : "End interview"}
        </Button>
      </div>
    </div>
  );
}
