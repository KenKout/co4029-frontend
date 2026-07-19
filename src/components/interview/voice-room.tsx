/**
 * Voice interview room: preserves the existing LiveKit session lifecycle while
 * presenting it as a focused AI-agent call workspace.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useVoiceAssistant,
} from "@livekit/components-react";
import { ConnectionState, DisconnectReason } from "livekit-client";
import "@livekit/components-styles";
import { Bot } from "lucide-react";
import { toast } from "sonner";

import { useInterviewRealtimeToken } from "@/lib/api/hooks/interviews";
import type { RealtimeTokenResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { VoiceControls } from "./voice-controls";
import { VoiceTranscript } from "./voice-transcript";
import { useIntegrityReporter } from "./use-integrity-reporter";

interface VoiceRoomProps {
  sessionId: string;
  elapsed?: string;
  onCompleted: () => void;
}

function RoomContent({
  onEndInterview,
  isEnding,
  onCompleted,
  elapsed,
}: {
  onEndInterview: () => void;
  isEnding: boolean;
  onCompleted: () => void;
  elapsed?: string;
}) {
  const connectionState = useConnectionState();
  const { agent, state: agentState } = useVoiceAssistant();
  const agentWasPresent = useRef(false);

  useEffect(() => {
    if (agent) {
      agentWasPresent.current = true;
    } else if (agentWasPresent.current) {
      onCompleted();
    }
  }, [agent, onCompleted]);

  const connecting =
    connectionState === ConnectionState.Connecting ||
    connectionState === ConnectionState.Reconnecting;
  const active = agentState === "speaking" || agentState === "listening";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <section className="min-h-0 flex-1 overflow-hidden" aria-label="Voice interview conversation">
        <div className="mx-auto flex h-full w-full max-w-[900px] flex-col px-4 sm:px-8">
          <div className="flex shrink-0 flex-col items-center pb-6 pt-8 text-center sm:pt-12">
            <div
              className={cn(
                "relative flex size-16 items-center justify-center rounded-full border border-primary/15 bg-primary-soft text-primary transition-transform sm:size-20",
                active && "scale-105",
              )}
              aria-hidden="true"
            >
              {active && (
                <span className="absolute inset-0 rounded-full border border-primary/25 motion-safe:animate-ping" />
              )}
              <Bot className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <p className="mt-3 text-sm font-semibold text-text-strong">AI interviewer</p>
            {connecting && (
              <p className="mt-1 text-xs text-text-muted motion-safe:animate-pulse">
                Connecting to voice interview…
              </p>
            )}
          </div>

          <VoiceTranscript className="min-h-0 flex-1 pb-6" />
        </div>
      </section>

      <div className="shrink-0 bg-white/95 px-2 pb-2 pt-1 backdrop-blur-md sm:px-4 sm:pb-4">
        <div className="mx-auto w-full max-w-[920px] rounded-xl border border-border bg-white px-3 py-2.5 shadow-editorial sm:px-4 sm:py-3">
          <VoiceControls
            onEndInterview={onEndInterview}
            isEnding={isEnding}
            elapsed={elapsed}
          />
        </div>
      </div>
    </div>
  );
}

export function VoiceRoom({ sessionId, elapsed, onCompleted }: VoiceRoomProps) {
  const [tokenData, setTokenData] = useState<RealtimeTokenResponse | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const fetchToken = useInterviewRealtimeToken(sessionId);

  useIntegrityReporter(sessionId);

  const acquireToken = useCallback(async () => {
    setIsFetchingToken(true);
    try {
      const data = await fetchToken.mutateAsync();
      setTokenData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get voice token";
      toast.error(message);
    } finally {
      setIsFetchingToken(false);
    }
  }, [fetchToken]);

  useEffect(() => {
    void acquireToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleDisconnected = useCallback(
    (reason?: DisconnectReason) => {
      if (reason !== DisconnectReason.CLIENT_INITIATED) onCompleted();
    },
    [onCompleted],
  );

  const handleEndInterview = useCallback(() => {
    setIsEnding(true);
    onCompleted();
  }, [onCompleted]);

  if (isFetchingToken || !tokenData) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
        <div>
          <span className="mx-auto mb-4 block size-8 rounded-full border-2 border-primary/20 border-t-primary motion-safe:animate-spin" />
          <p className="text-sm text-text-muted motion-safe:animate-pulse">
            {isFetchingToken ? "Setting up voice interview…" : "Initializing…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={tokenData.url}
      token={tokenData.token}
      connect
      audio
      video={false}
      onDisconnected={handleDisconnected}
      className="flex min-h-0 flex-1 flex-col bg-white"
    >
      <RoomAudioRenderer />
      <RoomContent
        onEndInterview={handleEndInterview}
        isEnding={isEnding}
        onCompleted={onCompleted}
        elapsed={elapsed}
      />
    </LiveKitRoom>
  );
}
