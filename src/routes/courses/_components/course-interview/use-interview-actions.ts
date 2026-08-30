import { useCallback, useRef } from "react";
import { toast } from "sonner";

import type { UseInterviewChatResult } from "@/components/interview/use-interview-chat";
import type {
  InterviewLanguage,
  InterviewOnboardingAction,
} from "@/lib/api/types";
import type { StateSnapshot } from "@/lib/interview/control-protocol";
import {
  makeCeremonyTurn,
  type FinishReason,
  type InterviewTurnAction,
} from "@/lib/interview/turn-factory";
import { clearQuestionPacing } from "@/lib/interview/use-question-pacing";
import { shouldPresentGoodbye } from "./agent-voice-presentation";
import { handleRespond } from "./interview-answer-actions";
import {
  handleAssistance,
  handleEndCancel,
  handleEndConfirm,
} from "./interview-assistance-actions";
import { handleOnboarding } from "./interview-onboarding-actions";
import { applyStateSnapshot } from "./interview-snapshot-actions";
import {
  handleRetry,
  handleStart,
} from "./interview-start-actions";
import type { InterviewActionsContext, InterviewBase } from "./types";
import {
  useInterviewTimeout,
  useTurnPresentedHandler,
} from "./use-interview-sequencing";

/**
 * The page's event handlers. `beginClosing`, `handleTurnPresented` and the
 * timeout effect are hooks and stay in their original relative order (last
 * hook group — see use-course-interview.ts); everything else is a plain
 * closure in the action modules, called with `ctx` instead of relying on the
 * enclosing component scope.
 */
export function useInterviewActions(base: InterviewBase) {
  const {
    sessionId,
    phase,
    narration,
    finish,
    t,
    leaveBlocker,
    startHandlerRef,
    sessionStartedAtRef,
    setAnswerText,
    setEndDialogOpen,
    setAiSpeaking,
    setAiPresenting,
    setPhase,
    setClosingReason,
    setCurrentQuestion,
    setPendingFirstQuestion,
    setPendingFinishResult,
    setTranscript,
    setFinishResult,
  } = base;

  const currentElapsedSeconds = () =>
    sessionStartedAtRef.current === null
      ? 0
      : Math.max(
          0,
          Math.floor((Date.now() - sessionStartedAtRef.current) / 1000),
        );

  const beginClosing = useCallback(
    async (reason: FinishReason) => {
      if (!sessionId || phase === "closing" || phase === "results") return;
      narration.cancel();
      // Whether the goodbye is shown at all depends on WHO ended the interview.
      //
      // "natural" — the turn pipeline finished, so on a live room the agent is
      // speaking that closing over LiveKit right now. Keep the two-turn ending:
      // present the goodbye, then move to the result when it finishes.
      //
      // "ended_early" (End button / leaving) and "timed_out" — the candidate is
      // done and wants out, and the agent is not involved on these paths at all
      // (POST /finish only writes the ceremony message and enqueues the
      // evaluation). Holding them ~10s for a farewell they did not ask for is
      // pure friction, so go straight to the result. The goodbye is still
      // persisted server-side, so it remains in the transcript.
      const closingElapsedSeconds = currentElapsedSeconds();
      setAnswerText("");
      setEndDialogOpen(false);
      setAiSpeaking(false);
      setAiPresenting(false);
      setClosingReason(reason);
      setPhase("closing");

      try {
        const result = await finish.mutateAsync({ reason });
        // Session is terminal — drop the per-question pacing anchors.
        clearQuestionPacing(sessionId);
        setCurrentQuestion(null);
        setPendingFirstQuestion(null);
        if (
          shouldPresentGoodbye({ reason, closingText: result.closing_text })
        ) {
          // Presenting this turn is what advances closing -> results
          // (see use-interview-sequencing's handleTurnPresented).
          setPendingFinishResult(result);
          setTranscript((previous) => [
            ...previous.filter((turn) => turn.kind !== "closing"),
            makeCeremonyTurn(
              "closing",
              result.closing_text!,
              sessionId,
              closingElapsedSeconds,
            ),
          ]);
        } else {
          // No goodbye turn is rendered, so nothing would ever fire the
          // presentation trigger — enter the result directly. Also covers a
          // server that returned no closing_text at all.
          setPendingFinishResult(null);
          setPhase("results");
          setClosingReason(null);
          setFinishResult(result);
        }
      } catch (error) {
        setClosingReason(null);
        setPhase("questioning");
        toast.error(
          (error as Error).message ||
            t("course_interview.errors.finish_failed"),
        );
      }
    },
    // The narration methods are stable and are intentionally read at call
    // time; including their wrapper object would restart timeout effects.

    [sessionId, phase, finish, t],
  );

  /**
   * LiveKit chat capability for typed turns, mounted by the workspace screen
   * (inside the room provider). Every turn handler reads `chatBridge.current` at
   * call time; a null bridge means the room is not up and no turn can be sent.
   */
  const chatBridge = useRef<UseInterviewChatResult | null>(null);

  /**
   * Bridge setter for the workspace screen: mounts the chat hook (the only
   * place the room is reachable) and hands it to `handleRespond`. Kept as a
   * controller method rather than a direct `iv.chatBridge.current = ...`
   * write so the screen never mutates a prop (hooks/immutability).
   */
  const setChatBridge = useCallback((chat: UseInterviewChatResult | null) => {
    chatBridge.current = chat;
  }, []);

  const ctx: InterviewActionsContext = {
    ...base,
    currentElapsedSeconds,
    beginClosing,
    chatBridge,
  };

  const handleTurnPresented = useTurnPresentedHandler(base, {
    currentElapsedSeconds,
    beginClosing,
  });

  /**
   * Apply a server snapshot. Stable identity so the chat hook's stored callback
   * never churns, and it reads `ctx` — which is rebuilt every render — so it
   * always sees current state rather than the state at subscription time.
   */
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const handleStateSnapshot = useCallback((snapshot: StateSnapshot) => {
    applyStateSnapshot(ctxRef.current, snapshot);
  }, []);

  useInterviewTimeout(base, beginClosing);

  function stayInInterview() {
    if (leaveBlocker.status === "blocked") leaveBlocker.reset();
  }

  function leaveInterviewOpen() {
    if (leaveBlocker.status !== "blocked") return;
    narration.cancel();
    leaveBlocker.proceed();
  }

  const startInterview = () => handleStart(ctx);
  // The auto-resume effect in useInterviewServerSync reached handleStart through
  // function hoisting before the split; this keeps that "current declaration,
  // read at call time" contract.
  startHandlerRef.current = startInterview;

  return {
    currentElapsedSeconds,
    beginClosing,
    chatBridge,
    setChatBridge,
    handleTurnPresented,
    handleStateSnapshot,
    handleStart: startInterview,
    handleRetry: () => handleRetry(ctx),
    handleOnboarding: (
      action?: InterviewOnboardingAction,
      languageOverride?: InterviewLanguage,
      nameOverride?: string,
    ) => handleOnboarding(ctx, action, languageOverride, nameOverride),
    handleRespond: (
      answerOverride?: string,
      options?: { retrySubmissionId?: string },
    ) => handleRespond(ctx, answerOverride, options),
    handleAssistance: (
      requestText: string,
      turnAction: Exclude<InterviewTurnAction, "answer">,
      displayText: string,
    ) => handleAssistance(ctx, requestText, turnAction, displayText),
    handleEndConfirm: () => handleEndConfirm(ctx),
    handleEndCancel: () => handleEndCancel(ctx),
    stayInInterview,
    leaveInterviewOpen,
  };
}
