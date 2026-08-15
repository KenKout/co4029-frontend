import { useCallback, useEffect } from "react";

import type { ConversationTurn } from "@/lib/interview/types";
import { makeAiTurn, type FinishReason } from "@/lib/interview/turn-factory";
import type { InterviewBase } from "./types";

/**
 * Turn-presentation sequencing and the session timeout, lifted verbatim out of
 * course-interview.tsx. Both are hooks, so they stay in their original relative
 * order: handleTurnPresented (useCallback) then the timeout (useEffect) — see
 * use-interview-actions.ts.
 */

export function useTurnPresentedHandler(
  base: InterviewBase,
  helpers: {
    currentElapsedSeconds: () => number;
    beginClosing: (reason: FinishReason) => Promise<void>;
  },
) {
  const {
    phase,
    pendingFirstQuestion,
    pendingNextQuestion,
    pendingFinalTransition,
    pendingFinishResult,
    setPresentedAiTurnIds,
    setCurrentQuestion,
    setPendingFirstQuestion,
    setPendingNextQuestion,
    setPendingFinalTransition,
    setPendingFinishResult,
    setFinishResult,
    setTranscript,
    setPhase,
  } = base;
  const { currentElapsedSeconds, beginClosing } = helpers;

  return useCallback(
    (turn: ConversationTurn) => {
      // Record it first: the docked transcript withholds the newest AI turn
      // until it lands here, so this must happen on EVERY presented turn, not
      // only the ones the sequencing branches below care about.
      if (turn.role === "ai") {
        setPresentedAiTurnIds((current) =>
          current.has(turn.id) ? current : new Set([...current, turn.id]),
        );
      }
      if (turn.kind === "transition" && phase === "transition") {
        if (pendingFirstQuestion) {
          const question = pendingFirstQuestion;
          setCurrentQuestion(question);
          setPendingFirstQuestion(null);
          setPhase("questioning");
          setTranscript((previous) => [
            ...previous,
            makeAiTurn(question, false, currentElapsedSeconds()),
          ]);
          return;
        }
        // Mid-interview advance: the transition finished presenting/narrating, so
        // now reveal the held next Question Card (spec §Frontend Sequencing —
        // the card never appears at the same time as its transition).
        if (pendingNextQuestion) {
          const question = pendingNextQuestion;
          setPendingNextQuestion(null);
          setCurrentQuestion(question);
          setPhase("questioning");
          setTranscript((previous) => [
            ...previous,
            makeAiTurn(question, false, currentElapsedSeconds()),
          ]);
          return;
        }
        // Final-question transition finished: now run the existing finish flow so
        // the separate goodbye follows (spec §ending — two short turns).
        if (pendingFinalTransition) {
          setPendingFinalTransition(false);
          void beginClosing("natural");
          return;
        }
      }
      if (
        turn.kind === "closing" &&
        phase === "closing" &&
        pendingFinishResult
      ) {
        setPhase("results");
        setFinishResult(pendingFinishResult);
        setPendingFinishResult(null);
      }
    },
    [
      pendingFinishResult,
      pendingFirstQuestion,
      pendingNextQuestion,
      pendingFinalTransition,
      beginClosing,
      phase,
    ],
  );
}

export function useInterviewTimeout(
  base: InterviewBase,
  beginClosing: (reason: FinishReason) => Promise<void>,
) {
  const { sessionId, phase, sessionDeadlineAt, timeoutTriggeredRef } = base;

  // `sessionDeadlineAt` is in the deps, which is the whole point: a snapshot can
  // reconcile the deadline without any phase change, and the pending timer must
  // be torn down and rescheduled against the new value. Before this it only
  // rescheduled on the next `questioning ⇄ transition` flip.
  useEffect(() => {
    const deadline = sessionDeadlineAt;
    if (
      !sessionId ||
      deadline === null ||
      phase === "closing" ||
      phase === "results" ||
      timeoutTriggeredRef.current
    ) {
      return;
    }
    const trigger = () => {
      if (timeoutTriggeredRef.current) return;
      timeoutTriggeredRef.current = true;
      void beginClosing("timed_out");
    };
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      trigger();
      return;
    }
    const timer = window.setTimeout(trigger, remaining);
    return () => window.clearTimeout(timer);
  }, [beginClosing, phase, sessionId, sessionDeadlineAt]);
}
