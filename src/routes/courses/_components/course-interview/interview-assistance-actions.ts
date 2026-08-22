import { toast } from "sonner";

import {
  CANCEL_END_REPLY,
  CONFIRM_END_REPLY,
} from "@/lib/interview/end-confirmation";
import {
  makeUserTurn,
  newTurnKey,
  type InterviewTurnAction,
} from "@/lib/interview/turn-factory";
import type { InterviewActionsContext } from "./types";

/**
 * Assistance turns (clarify / hint / explain-term) and the end-confirmation
 * replies, over the SAME `lk.chat` door the answer path uses.
 *
 * These used to POST `/respond`, which meant the stateless REST brain could
 * mutate DB state that the agent's snapshot then reported back as authoritative.
 * The backend now honours `turn_action` on the wire: `hint` is routed to the
 * server's hint-ladder tool, and `clarify` / `explain_term` / `repeat` are framed
 * as help requests so they are NOT graded as answers.
 *
 * They are not the candidate's answer, so they keep the original optimistic-append
 * behaviour and never touch the answer-submission state machine — only a real
 * "answer" turn drives draft→submitting→submitted/failed (see handleRespond).
 */

/** The transport, when a turn can actually be sent right now. */
function readyChat(ctx: InterviewActionsContext) {
  const chat = ctx.chatBridge.current;
  if (!ctx.currentQuestion || !ctx.sessionId || !chat || chat.pending) {
    return null;
  }
  return chat;
}

function rollbackAssistanceTurn(
  ctx: InterviewActionsContext,
  args: { turnKey: string; message: string },
) {
  ctx.setTranscript((previous) =>
    previous.filter((turn) => turn.id !== `a-${args.turnKey}`),
  );
  toast.error(args.message);
}

export async function handleAssistance(
  ctx: InterviewActionsContext,
  requestText: string,
  turnAction: Exclude<InterviewTurnAction, "answer">,
  displayText: string,
) {
  const chat = readyChat(ctx);
  if (!chat) return;
  const trimmed = requestText.trim();
  if (!trimmed) return;

  // ONE key for both the transcript entry and the wire idempotency key. They used
  // to be independent — a `${questionId}-${Date.now()}` transcript key and a fresh
  // `newTurnKey()` per attempt — which meant a resent assistance turn was a NEW
  // turn to the agent and could debit the hint ladder twice.
  const turnKey = newTurnKey();
  ctx.setTranscript((prev) => [
    ...prev,
    makeUserTurn(
      displayText,
      turnKey,
      ctx.currentElapsedSeconds(),
      turnAction === "hint" ? "hint" : "clarification",
    ),
  ]);

  try {
    const outcome = await chat.sendTurn({
      text: trimmed,
      turnAction,
      turnKey,
    });
    // The agent's reply is spoken and arrives on `lk.transcription`; nothing is
    // rendered from the ack. A refusal is the only thing to act on.
    if (outcome.preserveDraft) {
      rollbackAssistanceTurn(ctx, {
        turnKey,
        message: ctx.t("course_interview.errors.send_failed_livekit"),
      });
    }
  } catch (err) {
    rollbackAssistanceTurn(ctx, {
      turnKey,
      message:
        (err as Error).message || ctx.t("course_interview.errors.send_failed"),
    });
  }
}

/**
 * End-confirmation gate (Slice 4) — the candidate answered the "end and submit,
 * or continue?" prompt via the explicit controls. Both send a canned reply the
 * backend's confirmation-scoped classifier recognises.
 *
 * The reply is best-effort and the close is not conditional on it: the candidate
 * pressed "End and submit", so the session is finished through the same
 * `beginClosing` the End dialog uses rather than waiting for the agent to decide.
 * Sending it anyway keeps the agent's `chat_ctx` honest about why the interview
 * ended.
 */
export async function handleEndConfirm(ctx: InterviewActionsContext) {
  const chat = readyChat(ctx);
  if (!chat) return;
  ctx.setEndConfirming(false);
  ctx.setEndConfirmPrompt("");
  try {
    await chat.sendTurn({
      text: CONFIRM_END_REPLY,
      turnAction: "answer",
      turnKey: newTurnKey(),
    });
  } catch {
    /* The close below is what the candidate asked for; the reply is courtesy. */
  }
  await ctx.beginClosing("ended_early");
}

export async function handleEndCancel(ctx: InterviewActionsContext) {
  const chat = readyChat(ctx);
  try {
    await chat?.sendTurn({
      text: CANCEL_END_REPLY,
      turnAction: "answer",
      turnKey: newTurnKey(),
    });
  } catch {
    // Even if the cancel round-trip fails, locally returning to the question is
    // the safe default (the agent treats a non-confirm while pending as a cancel,
    // and never advanced/scored). Surface nothing disruptive.
  } finally {
    // Return to the current question; the preserved draft is already restored.
    ctx.setEndConfirming(false);
    ctx.setEndConfirmPrompt("");
  }
}
