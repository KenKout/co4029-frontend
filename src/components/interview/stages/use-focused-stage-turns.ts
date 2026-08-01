import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TFunction } from "i18next";

import type {
  ConversationTurn,
  InterviewAgentStatus,
} from "@/lib/interview/types";
import type { StageSpeak } from "./types";
import { useStageAnnouncement } from "./use-stage-announcement";

/**
 * All of the focused stage's turn bookkeeping: which AI turn is active, which
 * assistance turn hangs off it, which turns have finished presenting, replay
 * locking, and the polite screen-reader announcement.
 *
 * The hook calls are in exactly the order the pre-split component used them
 * (two `useState`, `useRef`, three `useMemo`, `useEffect`, two `useCallback`,
 * one `useMemo`) with identical dependency arrays, so React sees the same hook
 * sequence it always did. `t` is passed in rather than resolved here so the
 * caller's single `useTranslation()` stays first in the order.
 */
export function useFocusedStageTurns({
  transcript,
  status,
  assessmentActive,
  currentQuestionNumber,
  replayAvailable,
  speak,
  onSpeakingChange,
  onTurnPresented,
  t,
}: {
  transcript: ConversationTurn[];
  status: InterviewAgentStatus;
  assessmentActive: boolean;
  currentQuestionNumber: number;
  replayAvailable: boolean;
  speak: StageSpeak;
  onSpeakingChange: (speaking: boolean) => void;
  onTurnPresented: ((turn: ConversationTurn) => void) | undefined;
  t: TFunction;
}) {
  const [presentedAiTurnIds, setPresentedAiTurnIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [replayingTurnId, setReplayingTurnId] = useState<string | null>(null);
  const replayLockRef = useRef(false);

  const activeTurnIndex = useMemo(() => {
    for (let index = transcript.length - 1; index >= 0; index -= 1) {
      const turn = transcript[index];
      if (turn.role !== "ai") continue;
      if (
        !assessmentActive ||
        (turn.kind !== "clarification" && turn.kind !== "hint")
      ) {
        return index;
      }
    }
    return -1;
  }, [assessmentActive, transcript]);
  const activeTurn = activeTurnIndex >= 0 ? transcript[activeTurnIndex] : null;
  const assistanceTurn = useMemo(() => {
    if (!assessmentActive || activeTurnIndex < 0) return null;
    for (
      let index = transcript.length - 1;
      index > activeTurnIndex;
      index -= 1
    ) {
      const turn = transcript[index];
      if (
        turn.role === "ai" &&
        (turn.kind === "clarification" || turn.kind === "hint")
      ) {
        return turn;
      }
    }
    return null;
  }, [activeTurnIndex, assessmentActive, transcript]);
  const hintUsed = useMemo(
    () =>
      assessmentActive &&
      activeTurnIndex >= 0 &&
      transcript
        .slice(activeTurnIndex + 1)
        .some((turn) => turn.role === "ai" && turn.kind === "hint"),
    [activeTurnIndex, assessmentActive, transcript],
  );

  useEffect(() => {
    if (!activeTurn) return;
    setPresentedAiTurnIds((current) => {
      const priorAiIds = transcript
        .slice(0, activeTurnIndex)
        .filter((turn) => turn.role === "ai")
        .map((turn) => turn.id);
      if (assistanceTurn) priorAiIds.push(activeTurn.id);
      if (priorAiIds.every((id) => current.has(id))) return current;
      return new Set([...current, ...priorAiIds]);
    });
  }, [activeTurn, activeTurnIndex, assistanceTurn, transcript]);

  const replayBlocked =
    !replayAvailable ||
    status === "listening" ||
    status === "thinking" ||
    status === "speaking" ||
    status === "disconnected";

  const replayTurn = useCallback(
    async (turn: ConversationTurn) => {
      if (replayLockRef.current || replayBlocked) return;
      replayLockRef.current = true;
      setReplayingTurnId(turn.id);
      onSpeakingChange(true);
      try {
        const presentation = speak(turn.text);
        if (
          presentation &&
          typeof presentation === "object" &&
          "finished" in presentation
        ) {
          await presentation.finished.catch(() => undefined);
        } else {
          await Promise.resolve(presentation).catch(() => undefined);
        }
      } finally {
        replayLockRef.current = false;
        setReplayingTurnId(null);
        onSpeakingChange(false);
      }
    },
    [onSpeakingChange, replayBlocked, speak],
  );

  const markPresented = useCallback(
    (turn: ConversationTurn) => {
      setPresentedAiTurnIds((current) => {
        if (current.has(turn.id)) return current;
        return new Set([...current, turn.id]);
      });
      onTurnPresented?.(turn);
    },
    [onTurnPresented],
  );

  const announceTurn = assistanceTurn ?? activeTurn;
  const announcement = useStageAnnouncement({
    announceTurn,
    presentedAiTurnIds,
    assessmentActive,
    currentQuestionNumber,
    t,
  });

  return {
    presentedAiTurnIds,
    replayingTurnId,
    activeTurn,
    assistanceTurn,
    hintUsed,
    replayBlocked,
    replayTurn,
    markPresented,
    announcement,
  };
}
