import type { MutableRefObject } from "react";

import type { UseInterviewChatResult } from "@/components/interview/use-interview-chat";
import type { FinishReason } from "@/lib/interview/turn-factory";
import type { useInterviewDrafts } from "./use-interview-drafts";
import type { useInterviewPhaseState } from "./use-interview-phase-state";
import type { useInterviewProgress } from "./use-interview-progress";
import type { useInterviewRouteData } from "./use-interview-route-data";
import type { useInterviewServerSync } from "./use-interview-server-sync";
import type { useInterviewSpeech } from "./use-interview-speech";
import type { useInterviewTurnState } from "./use-interview-turn-state";

/**
 * Shared types for the course-interview screen, extracted from the former
 * 2.3k-line course-interview.tsx so the screen components and the action
 * modules agree on one definition instead of re-declaring dozens of props.
 */

/**
 * Everything the page's hook groups expose, in the order they are called. The
 * action modules receive this (plus the two members defined alongside them) as
 * a single context object, which is what the pre-split handlers had as their
 * enclosing closure.
 */
export type InterviewBase = ReturnType<typeof useInterviewRouteData> &
  ReturnType<typeof useInterviewTurnState> &
  ReturnType<typeof useInterviewPhaseState> &
  ReturnType<typeof useInterviewDrafts> &
  ReturnType<typeof useInterviewServerSync> &
  ReturnType<typeof useInterviewSpeech> &
  ReturnType<typeof useInterviewProgress>;

export type InterviewActionsContext = InterviewBase & {
  currentElapsedSeconds: () => number;
  beginClosing: (reason: FinishReason) => Promise<void>;
  /**
   * LiveKit chat capability, written by the workspace screen (the only place
   * inside the room provider) once `useInterviewChat` has mounted. `handleRespond`
   * reads it at call time to decide the transport — a mutable ref, not a prop,
   * because the actions are built OUTSIDE the provider while the room only
   * exists INSIDE it.
   */
  chatBridge: MutableRefObject<UseInterviewChatResult | null>;
};
