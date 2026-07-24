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
import type { ConversationTurn } from "./interview-workspace";

interface VoiceRoomProps {
  sessionId: string;
  elapsed?: string;
  initialTranscript?: ConversationTurn[];
  onCompleted: (reason: "natural" | "ended_early") => void;
  onTranscriptChange?: (turns: ConversationTurn[]) => void;
  /**
   * Called when the LiveKit room drops for a reason OTHER than a natural
   * agent departure or an explicit end (resilience A-Tier-1 #3): a transient
   * network / server disconnect that should NOT finalize+grade the session.
   * The route offers to continue the interview in text instead.
   */
  onVoiceDropped?: () => void;
}

function RoomContent({
  onEndInterview,
  isEnding,
  onCompleted,
  elapsed,
  initialTranscript,
  onTranscriptChange,
}: {
  onEndInterview: () => void;
  isEnding: boolean;
  onCompleted: (reason: "natural" | "ended_early") => void;
  elapsed?: string;
  initialTranscript?: ConversationTurn[];
  onTranscriptChange?: (turns: ConversationTurn[]) => void;
}) {
  const connectionState = useConnectionState();
  const { agent, state: agentState } = useVoiceAssistant();
  const agentWasPresent = useRef(false);

  useEffect(() => {
    if (agent) {
      agentWasPresent.current = true;
    } else if (agentWasPresent.current) {
      onCompleted("natural");
    }
  }, [agent, onCompleted]);

  const connecting =
    connectionState === ConnectionState.Connecting ||
    connectionState === ConnectionState.Reconnecting;
  const active = agentState === "speaking" || agentState === "listening";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <section
        className="min-h-0 flex-1 overflow-hidden"
        aria-label="Voice interview conversation"
      >
        <div className="mx-auto flex h-full w-full max-w-[900px] flex-col px-4 sm:px-8">
          <div className="flex shrink-0 flex-col items-center pb-4 pt-5 text-center sm:pt-7">
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
            <p className="mt-3 text-sm font-semibold text-text-strong">
              AI interviewer
            </p>
            {connecting && (
              <p className="mt-1 text-xs text-text-muted motion-safe:animate-pulse">
                Connecting to voice interview…
              </p>
            )}
          </div>

          <VoiceTranscript
            className="min-h-0 flex-1 justify-center pb-6"
            initialTurns={initialTranscript}
            onTranscriptChange={onTranscriptChange}
          />
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

export function VoiceRoom({
  sessionId,
  elapsed,
  initialTranscript,
  onCompleted,
  onTranscriptChange,
  onVoiceDropped,
}: VoiceRoomProps) {
  const [tokenData, setTokenData] = useState<RealtimeTokenResponse | null>(
    null,
  );
  const [isEnding, setIsEnding] = useState(false);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const fetchToken = useInterviewRealtimeToken(sessionId);

  const acquireToken = useCallback(async () => {
    setIsFetchingToken(true);
    try {
      const data = await fetchToken.mutateAsync();
      setTokenData(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get voice token";
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
      // A client-initiated disconnect is the user's own End action — handled by
      // handleEndInterview, nothing to do here.
      if (reason === DisconnectReason.CLIENT_INITIATED) return;
      // Natural agent departure (the interview genuinely finished) is signalled
      // separately by the agentWasPresent effect in RoomContent → onCompleted.
      // A SERVER_SHUTDOWN / DUPLICATE_IDENTITY / other transient drop is a
      // FAILURE, not completion — don't finalize+grade the session. Offer the
      // text fallback when a handler is wired; otherwise fall back to the prior
      // behaviour so no path silently stalls (resilience A-Tier-1 #3).
      if (onVoiceDropped) {
        onVoiceDropped();
        return;
      }
      onCompleted("natural");
    },
    [onCompleted, onVoiceDropped],
  );

  const handleEndInterview = useCallback(() => {
    setIsEnding(true);
    onCompleted("ended_early");
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
        initialTranscript={initialTranscript}
        onTranscriptChange={onTranscriptChange}
      />
    </LiveKitRoom>
  );
}
