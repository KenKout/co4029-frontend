import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TFunction } from "i18next";

import type {
  ConversationTurn,
  InterviewAgentStatus,
} from "@/lib/interview/types";
import { stageHistoryTurns } from "./helpers";
import type { StageSpeak } from "./types";
import { useStageAnnouncement } from "./use-stage-announcement";

/**
 * All of the focused stage's turn bookkeeping: which AI turn is active, which
 * assistance turn hangs off it, what came before them, which turns have finished
 * presenting, replay locking, and the polite screen-reader announcement.
 *
 * The hook calls stay in the order the pre-split component used them (two
 * `useState`, `useRef`, then the `useMemo` group, `useEffect`, two
 * `useCallback`, one `useMemo`) with identical dependency arrays, so React sees
 * a stable hook sequence. `t` is passed in rather than resolved here so the
 * caller's single `useTranslation()` stays first in the order.
 */
export function useFocusedStageTurns({
  transcript,
  status,
  assessmentActive,
  currentQuestionNumber,
  replayAvailable,
  speak,
  /** Replay path. Defaults to `speak`; a live-LiveKit session passes a
   * replay-specific narrator so a user-initiated replay still works while the
   * agent (not the client) is the voice for NEW turns. */
  replaySpeak,
  onSpeakingChange,
  onTurnPresented,
  liveAgentTurns,
  agentSpeaks = false,
  t,
}: {
  transcript: ConversationTurn[];
  status: InterviewAgentStatus;
  assessmentActive: boolean;
  currentQuestionNumber: number;
  replayAvailable: boolean;
  speak: StageSpeak;
  replaySpeak?: StageSpeak;
  liveAgentTurns?: readonly ConversationTurn[];
  agentSpeaks?: boolean;
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
  const hintsUsed = useHintsUsed(transcript, activeTurnIndex, assessmentActive);
  const historyTurns = useStageHistory({
    transcript,
    activeTurn,
    assistanceTurn,
    liveAgentTurns,
    agentSpeaks,
  });

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
        const presentation = (replaySpeak ?? speak)(turn.text);
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
    [onSpeakingChange, replayBlocked, replaySpeak, speak],
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
    historyTurns,
    hintsUsed,
    replayBlocked,
    replayTurn,
    markPresented,
    announcement,
  };
}


function useStageHistory(args: {
  transcript: ConversationTurn[];
  activeTurn: ConversationTurn | null;
  assistanceTurn: ConversationTurn | null;
  liveAgentTurns: readonly ConversationTurn[] | undefined;
  agentSpeaks: boolean;
}): ConversationTurn[] {
  const { transcript, activeTurn, assistanceTurn, liveAgentTurns, agentSpeaks } =
    args;
  return useMemo(
    () =>
      stageHistoryTurns(transcript, activeTurn, assistanceTurn, {
        liveTurns: liveAgentTurns,
        agentSpeaks,
      }),
    [activeTurn, agentSpeaks, assistanceTurn, liveAgentTurns, transcript],
  );
}


/**
 * How many hints the interviewer has already given on the CURRENT question.
 *
 * Counts, not a boolean. The server runs an escalating hint ladder capped at
 * MAX_HINTS_PER_QUESTION rungs and resets it per question, so a boolean
 * "hintUsed" locked the control after the first rung and made every rung past
 * it unreachable through the UI.
 *
 * Only turns AFTER the active question count, which is what scopes this to the
 * question in play — the ladder resets server-side on advance.
 */
function useHintsUsed(
  transcript: ConversationTurn[],
  activeTurnIndex: number,
  assessmentActive: boolean,
): number {
  return useMemo(() => {
    if (!assessmentActive || activeTurnIndex < 0) return 0;
    return transcript
      .slice(activeTurnIndex + 1)
      .filter((turn) => turn.role === "ai" && turn.kind === "hint").length;
  }, [activeTurnIndex, assessmentActive, transcript]);
}
