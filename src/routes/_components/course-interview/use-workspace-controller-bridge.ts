import { useEffect } from "react";

import type { UseInterviewChatResult } from "@/components/interview/use-interview-chat";
import type { CourseInterviewController } from "./use-course-interview";

/**
 * Publish what only the workspace screen can see up to the controller.
 *
 * The actions are built OUTSIDE the room provider while the room exists only
 * INSIDE it, so three values have to travel upward: the chat capability itself
 * (through a ref, since the handlers read it at call time), the turn's in-flight
 * flag (through state, since the header/composer/end-panel render outside the
 * provider), and whether the agent now owns the voice.
 *
 * Setters, never a direct `iv.chatBridge.current = ...` write, so the immutability
 * rule never sees a prop mutation.
 */
export function useWorkspaceControllerBridge(args: {
  iv: CourseInterviewController;
  chat: UseInterviewChatResult;
  agentOwnsTheVoice: boolean;
}) {
  const { iv, chat, agentOwnsTheVoice } = args;
  const { setChatBridge, setRoomConnected, setTurnPending } = iv;

  useEffect(() => {
    setChatBridge(chat);
    setTurnPending(chat.pending);
    // The agent in the room speaks every utterance via LiveKit TTS; the workspace
    // must not narrate the same text client-side (double voice). Same predicate as
    // the screen's render-phase ref write, so the state driving the
    // cancel-on-handover and the voice toggle can never disagree with the ref the
    // narration gate actually reads.
    setRoomConnected(agentOwnsTheVoice);
    return () => {
      setChatBridge(null);
      setRoomConnected(false);
      setTurnPending(false);
    };
  }, [
    setChatBridge,
    setRoomConnected,
    setTurnPending,
    agentOwnsTheVoice,
    chat,
  ]);
}
