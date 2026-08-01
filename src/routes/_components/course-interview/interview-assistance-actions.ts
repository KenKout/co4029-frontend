import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import {
  CANCEL_END_REPLY,
  CONFIRM_END_REPLY,
  isAwaitingEndConfirmation,
} from "@/lib/interview/end-confirmation";
import {
  makeAiTurn,
  makeFollowUpTurn,
  makeUserTurn,
  newTurnKey,
  type InterviewTurnAction,
} from "@/lib/interview/turn-factory";
import { resolveAssistanceTurnKind } from "./helpers";
import type { InterviewActionsContext } from "./types";

/**
 * Assistance turns (clarify / hint / explain-term) and the end-confirmation
 * replies, lifted verbatim out of course-interview.tsx with the page closure
 * passed explicitly as `ctx`.
 */

type RespondResult = Awaited<
  ReturnType<InterviewActionsContext["respond"]["mutateAsync"]>
>;

function appendAssistanceTurns(
  ctx: InterviewActionsContext,
  args: { result: RespondResult; userTurnKey: string; standaloneText: string },
) {
  const { result, userTurnKey, standaloneText } = args;
  const assistanceTurnKind = resolveAssistanceTurnKind(result.assistance_kind);
  if (result.assistance_kind) {
    ctx.setTranscript((previous) =>
      previous.map((turn) =>
        turn.id === `a-${userTurnKey}`
          ? { ...turn, kind: assistanceTurnKind }
          : turn,
      ),
    );
  }
  ctx.setTranscript((prev) => [
    ...prev,
    makeFollowUpTurn(
      standaloneText,
      `${userTurnKey}-fu`,
      ctx.currentElapsedSeconds(),
      assistanceTurnKind,
    ),
  ]);
}

function reportAssistanceFailure(
  ctx: InterviewActionsContext,
  err: unknown,
  userTurnKey: string,
) {
  ctx.setTranscript((previous) =>
    previous.filter((turn) => turn.id !== `a-${userTurnKey}`),
  );
  if (err instanceof ApiError && err.status === 429) {
    toast.error(ctx.t("course_interview.errors.rate_limited"));
  } else {
    toast.error(
      (err as Error).message || ctx.t("course_interview.errors.send_failed"),
    );
  }
}

/**
 * Assistance turns (clarify / hint / explain-term) are NOT the candidate's
 * answer — they keep the original optimistic-append behaviour and never touch
 * the answer-submission state machine. Only a real "answer" turn drives the
 * draft→submitting→submitted/failed lifecycle (see handleRespond).
 */
export async function handleAssistance(
  ctx: InterviewActionsContext,
  requestText: string,
  turnAction: Exclude<InterviewTurnAction, "answer">,
  displayText: string,
) {
  const currentQuestion = ctx.currentQuestion;
  if (!currentQuestion || !ctx.sessionId || ctx.respond.isPending) return;
  const trimmed = requestText.trim();
  if (!trimmed) return;

  const userTurnKey = `${currentQuestion.id}-${Date.now()}`;
  const localTurnKind = turnAction === "hint" ? "hint" : "clarification";
  ctx.setTranscript((prev) => [
    ...prev,
    makeUserTurn(
      displayText,
      userTurnKey,
      ctx.currentElapsedSeconds(),
      localTurnKind,
    ),
  ]);

  try {
    const result = await ctx.respond.mutateAsync({
      session_id: ctx.sessionId,
      session_question_id: currentQuestion.id,
      answer_text: trimmed,
      turn_action: turnAction,
      turn_key: newTurnKey(),
    });

    ctx.reconcileDeadline(result.time_remaining_seconds);

    const finished = Boolean(result.should_finish ?? result.is_finished);
    const standaloneText =
      result.ai_turn_text || result.ai_followup_text || null;

    if (standaloneText && !finished) {
      appendAssistanceTurns(ctx, { result, userTurnKey, standaloneText });
    }

    if (finished) {
      await ctx.beginClosing("natural");
      return;
    }
    if (result.next_question) {
      ctx.setCurrentQuestion(result.next_question);
      ctx.setTranscript((prev) => [
        ...prev,
        makeAiTurn(result.next_question!, false, ctx.currentElapsedSeconds()),
      ]);
    }
  } catch (err) {
    reportAssistanceFailure(ctx, err, userTurnKey);
  }
}

/**
 * End-confirmation gate (Slice 4) — the candidate answered the "end and
 * submit, or continue?" prompt via the explicit controls. Both send a canned
 * reply the backend's confirmation-scoped classifier recognises, through the
 * same `respond` mutation and turn-key idempotency as any other turn.
 */
export async function handleEndConfirm(ctx: InterviewActionsContext) {
  const currentQuestion = ctx.currentQuestion;
  if (!currentQuestion || !ctx.sessionId || ctx.respond.isPending) return;
  try {
    const result = await ctx.respond.mutateAsync({
      session_id: ctx.sessionId,
      session_question_id: currentQuestion.id,
      answer_text: CONFIRM_END_REPLY,
      turn_action: "answer",
      turn_key: newTurnKey(),
    });
    ctx.setEndConfirming(false);
    ctx.setEndConfirmPrompt("");
    const finished = Boolean(result.should_finish ?? result.is_finished);
    // Confirmed → the backend closes; run the existing finish flow.
    if (finished || !isAwaitingEndConfirmation(result)) {
      await ctx.beginClosing("ended_early");
    }
  } catch (err) {
    toast.error(
      (err as Error).message || ctx.t("course_interview.errors.send_failed"),
    );
  }
}

export async function handleEndCancel(ctx: InterviewActionsContext) {
  const currentQuestion = ctx.currentQuestion;
  if (!currentQuestion || !ctx.sessionId || ctx.respond.isPending) return;
  try {
    await ctx.respond.mutateAsync({
      session_id: ctx.sessionId,
      session_question_id: currentQuestion.id,
      answer_text: CANCEL_END_REPLY,
      turn_action: "answer",
      turn_key: newTurnKey(),
    });
  } catch {
    // Even if the cancel round-trip fails, locally returning to the question
    // is the safe default (the backend treats a non-confirm while pending as
    // a cancel, and never advanced/scored). Surface nothing disruptive.
  } finally {
    // Return to the current question; the preserved draft is already restored.
    ctx.setEndConfirming(false);
    ctx.setEndConfirmPrompt("");
  }
}
