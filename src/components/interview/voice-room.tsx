/**
 * Voice interview room: fetches LiveKit token, connects to the room,
 * renders controls + transcript. On disconnect or agent leave, triggers
 * completion polling so the parent can show pass/fail + gap report.
 * Must be mounted only after a user gesture ("Start voice interview" button).
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
import { toast } from "sonner";

import { GlassCard } from "@/components/ui/glass-card";
import { useInterviewRealtimeToken } from "@/lib/api/hooks/interviews";
import type { RealtimeTokenResponse } from "@/lib/api/types";
import { VoiceControls } from "./voice-controls";
import { VoiceTranscript } from "./voice-transcript";
import { useIntegrityReporter } from "./use-integrity-reporter";

interface VoiceRoomProps {
  sessionId: string;
  onCompleted: () => void;
}

/** Inner component — only rendered inside the LiveKitRoom provider */
function RoomContent({
  onEndInterview,
  isEnding,
  onCompleted,
}: {
  onEndInterview: () => void;
  isEnding: boolean;
  onCompleted: () => void;
}) {
  const connectionState = useConnectionState();
  const { agent } = useVoiceAssistant();
  const agentWasPresent = useRef(false);

  // Track agent presence: once the agent leaves after being present, the
  // interview is done server-side — trigger completion check.
  useEffect(() => {
    if (agent) {
      agentWasPresent.current = true;
    } else if (agentWasPresent.current) {
      // Agent left — session is completed server-side
      onCompleted();
    }
  }, [agent, onCompleted]);

  const connecting =
    connectionState === ConnectionState.Connecting ||
    connectionState === ConnectionState.Reconnecting;

  return (
    <div className="space-y-4">
      {connecting && (
        <p className="text-sm text-center text-m3-on-surface-variant animate-pulse">
          Connecting to voice interview…
        </p>
      )}

      <GlassCard className="p-5">
        <VoiceTranscript className="mb-4" />
        <div className="border-t border-m3-outline-variant/20 pt-4">
          <VoiceControls
            onEndInterview={onEndInterview}
            isEnding={isEnding}
          />
        </div>
      </GlassCard>
    </div>
  );
}

export function VoiceRoom({ sessionId, onCompleted }: VoiceRoomProps) {
  const [tokenData, setTokenData] = useState<RealtimeTokenResponse | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const fetchToken = useInterviewRealtimeToken(sessionId);

  // Attach integrity event reporters
  useIntegrityReporter(sessionId);

  const acquireToken = useCallback(async () => {
    setIsFetchingToken(true);
    try {
      const data = await fetchToken.mutateAsync();
      setTokenData(data);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to get voice token";
      toast.error(msg);
    } finally {
      setIsFetchingToken(false);
    }
  }, [fetchToken]);

  // Fetch token on mount
  useEffect(() => {
    void acquireToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleDisconnected = useCallback(
    (reason?: DisconnectReason) => {
      // DisconnectReason 1 = CLIENT_INITIATED (user pressed end)
      if (reason !== DisconnectReason.CLIENT_INITIATED) {
        // Unexpected disconnect — trigger completion check
        onCompleted();
      }
    },
    [onCompleted],
  );

  const handleEndInterview = useCallback(() => {
    setIsEnding(true);
    // Disconnect triggers LiveKitRoom.onDisconnected with CLIENT_INITIATED;
    // we call onCompleted() directly here so there's no delay.
    onCompleted();
  }, [onCompleted]);

  if (isFetchingToken || !tokenData) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-sm text-m3-on-surface-variant animate-pulse">
          {isFetchingToken ? "Setting up voice interview…" : "Initializing…"}
        </p>
      </GlassCard>
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
    >
      <RoomAudioRenderer />
      <RoomContent
        onEndInterview={handleEndInterview}
        isEnding={isEnding}
        onCompleted={onCompleted}
      />
    </LiveKitRoom>
  );
}
