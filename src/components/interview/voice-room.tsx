/**
 * Voice interview room: preserves the existing LiveKit session lifecycle while
 * presenting it as a focused AI-agent call workspace.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useConnectionState,
  useVoiceAssistant,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import "@livekit/components-styles";
import { Bot } from "lucide-react";

import { useInterviewRoomState } from "./interview-room-provider";
import { useAgentJoinWatchdog } from "@/routes/_components/course-interview/use-agent-join-watchdog";
import { cn } from "@/lib/utils";
import { VoiceControls } from "./voice-controls";
import { VoiceTranscript } from "./voice-transcript";
import type { ConversationTurn } from "@/lib/interview/types";

interface VoiceRoomProps {
  elapsed?: string;
  initialTranscript?: ConversationTurn[];
  onCompleted: (reason: "natural" | "ended_early") => void;
  onTranscriptChange?: (turns: ConversationTurn[]) => void;
  /**
   * The agent was expected but never appeared within the join deadline. The
   * caller decides the fallback (voice→text resume); nothing here ends the
   * session, because an interview with nobody in it is NOT a finished one.
   */
  onAgentNeverJoined?: () => void;
}

function RoomContent({
  onEndInterview,
  isEnding,
  onCompleted,
  elapsed,
  initialTranscript,
  onTranscriptChange,
  agentExpected,
  onAgentNeverJoined,
}: {
  onEndInterview: () => void;
  isEnding: boolean;
  onCompleted: (reason: "natural" | "ended_early") => void;
  elapsed?: string;
  initialTranscript?: ConversationTurn[];
  onTranscriptChange?: (turns: ConversationTurn[]) => void;
  agentExpected: boolean;
  onAgentNeverJoined?: () => void;
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

  // The other dead-room case: room up, agent never dispatched (the worker
  // reports itself unavailable above the load threshold and LiveKit withholds
  // the job). Unlike `state === "failed"` there is no participant publishing
  // anything, so elapsed time is the only signal. Tell the caller once.
  const joinTimedOut = useAgentJoinWatchdog({
    expected: agentExpected,
    agentPresent: Boolean(agent),
  });
  const neverJoinedTold = useRef(false);
  useEffect(() => {
    if (!joinTimedOut || neverJoinedTold.current) return;
    neverJoinedTold.current = true;
    onAgentNeverJoined?.();
  }, [joinTimedOut, onAgentNeverJoined]);

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

/**
 * Consumer of the hoisted interview room (see `interview-room-provider.tsx`).
 *
 * This component used to OWN the room: it minted the token itself and rendered
 * `<LiveKitRoom>`. It no longer does, so a hybrid session can hold one room
 * across both the voice screen and the text workspace. Token acquisition and the
 * disconnect policy moved to the provider / its mount site; everything below the
 * provider (RoomContent, the transcript, the controls) is unchanged.
 *
 * The wrapper div reproduces the class list `<LiveKitRoom>` used to apply, so the
 * rendered DOM keeps the same flex structure it had before the hoist.
 */
export function VoiceRoom({
  elapsed,
  initialTranscript,
  onCompleted,
  onTranscriptChange,
  onAgentNeverJoined,
}: VoiceRoomProps) {
  const [isEnding, setIsEnding] = useState(false);
  const { room, connecting } = useInterviewRoomState();

  const handleEndInterview = useCallback(() => {
    setIsEnding(true);
    onCompleted("ended_early");
  }, [onCompleted]);

  if (connecting || !room) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
        <div>
          <span className="mx-auto mb-4 block size-8 rounded-full border-2 border-primary/20 border-t-primary motion-safe:animate-spin" />
          <p className="text-sm text-text-muted motion-safe:animate-pulse">
            {connecting ? "Setting up voice interview…" : "Initializing…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <RoomContent
        onEndInterview={handleEndInterview}
        isEnding={isEnding}
        onCompleted={onCompleted}
        elapsed={elapsed}
        initialTranscript={initialTranscript}
        onTranscriptChange={onTranscriptChange}
        agentExpected={!connecting && Boolean(room)}
        onAgentNeverJoined={onAgentNeverJoined}
      />
    </div>
  );
}
