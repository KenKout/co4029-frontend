import { useCallback, useRef } from "react";
import { toast } from "sonner";

import type { UseInterviewChatResult } from "@/components/interview/use-interview-chat";
import type {
  InterviewLanguage,
  InterviewOnboardingAction,
} from "@/lib/api/types";
import {
  makeCeremonyTurn,
  type FinishReason,
  type InterviewTurnAction,
} from "@/lib/interview/turn-factory";
import { clearQuestionPacing } from "@/lib/interview/use-question-pacing";
import { clientOwnsClosing } from "./agent-voice-presentation";
import { handleRespond } from "./interview-answer-actions";
import {
  handleAssistance,
  handleEndCancel,
  handleEndConfirm,
} from "./interview-assistance-actions";
import { handleOnboarding } from "./interview-onboarding-actions";
import {
  handleRetry,
  handleStart,
  handleVoiceCompleted,
  handleVoiceDropped,
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
    dictation,
    narration,
    claimClosingForClient,
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
      if (dictation.listening) dictation.stop();
      narration.cancel();
      // Who reads the goodbye depends on WHO ended the interview.
      //
      // "natural" means the turn pipeline reported finished — on a live room the
      // agent already ran submit_session and spoke that same closing string
      // itself (orchestration_bridge returns it as `speak_text`). The client
      // must stay silent or the candidate hears it twice.
      //
      // "ended_early" (End button / leaving) and "timed_out" (the client's own
      // timer) never reach the agent at all: `POST /finish` writes the ceremony
      // message and enqueues evaluation, and that is the whole of it. Nobody
      // was reading the goodbye on those paths.
      //
      // Claimed BEFORE the request so the ref is set by the time the closing
      // turn mounts and calls speak().
      if (clientOwnsClosing(reason)) claimClosingForClient();
      const closingElapsedSeconds = currentElapsedSeconds();
      setAnswerText("");
      setEndDialogOpen(false);
      setAiSpeaking(false);
      setAiPresenting(false);
      setPhase("closing");

      try {
        const result = await finish.mutateAsync({ reason });
        // Session is terminal — drop the per-question pacing anchors.
        clearQuestionPacing(sessionId);
        setCurrentQuestion(null);
        setPendingFirstQuestion(null);
        setPendingFinishResult(result);
        if (result.closing_text) {
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
          setPhase("results");
          setFinishResult(result);
          setPendingFinishResult(null);
        }
      } catch (error) {
        setPhase("questioning");
        toast.error(
          (error as Error).message ||
            t("course_interview.errors.finish_failed"),
        );
      }
    },
    // The dictation/narration methods are stable and are intentionally read at
    // call time; including their wrapper objects would restart timeout effects.

    [sessionId, phase, finish, t, claimClosingForClient],
  );

  /**
   * LiveKit chat capability for typed turns, mounted by the workspace screen
   * (inside the room provider). `handleRespond` reads `chatBridge.current` at
   * call time to pick the transport; when it is null or the flag is off, the
   * REST path runs exactly as before.
   */
  const chatBridge = useRef<UseInterviewChatResult | null>(null);

  /**
   * Bridge setter for the workspace screen: mounts the chat hook (the only
   * place the room is reachable) and hands it to `handleRespond`. Kept as a
   * controller method rather than a direct `iv.chatBridge.current = ...`
   * write so the screen never mutates a prop (hooks/immutability).
   */
  const setChatBridge = useCallback(
    (chat: UseInterviewChatResult | null) => {
      chatBridge.current = chat;
    },
    [],
  );

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

  useInterviewTimeout(base, beginClosing);

  function stayInInterview() {
    if (leaveBlocker.status === "blocked") leaveBlocker.reset();
  }

  function leaveInterviewOpen() {
    if (leaveBlocker.status !== "blocked") return;
    if (dictation.listening) dictation.stop();
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
    handleVoiceCompleted: (reason: "natural" | "ended_early") =>
      handleVoiceCompleted(ctx, reason),
    handleVoiceDropped: () => handleVoiceDropped(ctx),
    stayInInterview,
    leaveInterviewOpen,
  };
}
