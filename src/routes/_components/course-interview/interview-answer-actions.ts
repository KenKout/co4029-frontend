import { toast } from "sonner";

import type { TurnRejection } from "@/lib/interview/control-protocol";
import { makeUserTurn, newTurnKey } from "@/lib/interview/turn-factory";
import type { InterviewActionsContext } from "./types";

/**
 * The candidate's answer-submission lifecycle over `lk.chat`.
 *
 * There is one transport. A typed answer is published on the session's LiveKit
 * room and settled by the agent's ack on `abridge.interview.control`; every
 * consequence of that answer — the next question, the countdown, whether the
 * interview is over — arrives later as a session snapshot, not as a reply to this
 * send. See `interview-snapshot-actions.ts`.
 */

/**
 * The agent has the text — commit the turn.
 *
 * `accepted` is the only acknowledgement a streaming turn gets, and it means
 * "received", not "graded". Committing here is what the candidate needs: their
 * answer is in the transcript, the composer is clear, and the autosaved draft is
 * safe to drop. Deduped by submissionId so a retry reusing the id cannot create a
 * second entry.
 *
 * `reopenForFollowUp` is load-bearing, not cosmetic. The answer machine's
 * `submitted` status locks the composer until a NEW question arrives, but the
 * native agent frequently probes further on the SAME question — no tool call, no
 * snapshot, so nothing would ever unlock it. Returning to a clean draft on this
 * question keeps the composer usable; the beat while the agent replies is still
 * covered by `isComposerLocked`'s `agentStatus === "speaking"` arm.
 */
function commitAnswerTurn(
  ctx: InterviewActionsContext,
  args: { submissionId: string; trimmed: string; questionId: string },
) {
  const { submissionId, trimmed, questionId } = args;
  const answerTurnId = `a-${submissionId}`;
  ctx.setTranscript((prev) =>
    prev.some((turn) => turn.id === answerTurnId)
      ? prev
      : [
          ...prev,
          makeUserTurn(
            trimmed,
            submissionId,
            ctx.currentElapsedSeconds(),
            "answer",
          ),
        ],
  );
  ctx.submitSucceeded(trimmed);
  ctx.clearDraftAutosave();
  ctx.setAnswerText("");
  ctx.setRecentSubmission({ answer: trimmed, questionId, submissionId });
  ctx.reopenForFollowUp();
}

/**
 * A user-facing message for a turn the agent refused or could not run.
 *
 * The candidate needs to know WHY, not just that it failed — some of these they
 * can act on (wait for the previous turn), others they cannot (the interview is
 * closing). There is no HTTP status on this path, so the rejection code and the
 * error class are the only signals.
 */
function turnFailureMessage(
  ctx: InterviewActionsContext,
  rejection: TurnRejection | null,
): string {
  switch (rejection) {
    case "turn_in_flight":
      return ctx.t("course_interview.errors.turn_in_flight");
    case "session_closing":
      return ctx.t("course_interview.errors.session_closing");
    default:
      return ctx.t("course_interview.errors.send_failed_livekit");
  }
}

/**
 * Preserve the draft and expose retry (spec §3). No transcript entry was added,
 * the question/timer are untouched, and we do NOT advance.
 */
function reportAnswerFailure(
  ctx: InterviewActionsContext,
  args: { message: string; trimmed: string },
) {
  ctx.submitFailed(args.message);
  ctx.setAnswerText(args.trimmed);
  toast.error(args.message);
}

/**
 * Send the turn over `lk.chat` and settle it from the agent's ack.
 *
 * Nothing is derived from the outcome's `state`: on the native path there is
 * none. `completed` is still accepted here because the legacy routed agent emits
 * it, and a routed `completed` means the same thing this path needs — the agent
 * took the turn.
 */
async function sendTurnViaLiveKit(
  ctx: InterviewActionsContext,
  chat: NonNullable<InterviewActionsContext["chatBridge"]["current"]>,
  args: { text: string; turnKey: string; questionId: string },
): Promise<void> {
  const outcome = await chat.sendTurn({
    text: args.text,
    turnAction: "answer",
    turnKey: args.turnKey,
  });
  if (outcome.preserveDraft) {
    reportAnswerFailure(ctx, {
      message: turnFailureMessage(ctx, outcome.event.rejection),
      trimmed: args.text,
    });
    return;
  }
  commitAnswerTurn(ctx, {
    submissionId: args.turnKey,
    trimmed: args.text,
    questionId: args.questionId,
  });
}

/**
 * Whether a submit is allowed right now.
 *
 * Purely a duplicate-submission guard: the answer machine refuses a second send
 * while one is in flight or already acknowledged, and the transport refuses one
 * while a turn is pending.
 */
function isSubmitBlocked(ctx: InterviewActionsContext): boolean {
  const status = ctx.answer.state.status;
  if (status === "submitting" || status === "submitted") return true;
  return ctx.chatBridge.current?.pending ?? false;
}

/**
 * Submit the candidate's answer through the structured lifecycle (spec §2/§7):
 *
 *  1. `submitting`  — draft preserved, submit disabled, one submission only.
 *  2. `submitted`   — ONLY after the agent acknowledges: the answer is added to
 *     the transcript exactly once (deduped by submissionId), the compact
 *     confirmation replaces the editor, and the draft is cleared.
 *  3. `failed`      — the draft is preserved and retry is exposed; no transcript
 *     entry, no question advance, timer/question untouched.
 *
 * `retrySubmissionId` reuses the prior idempotency key so a retry after a failure
 * cannot create a duplicate transcript entry client- or agent-side.
 */
export async function handleRespond(
  ctx: InterviewActionsContext,
  answerOverride?: string,
  options: { retrySubmissionId?: string } = {},
) {
  if (!ctx.currentQuestion || !ctx.sessionId) return;
  if (isSubmitBlocked(ctx)) return;
  const pendingInterim = ctx.dictation.listening ? ctx.dictation.stop() : "";
  const sourceText = answerOverride ?? ctx.answerText;
  const trimmed = [sourceText.trim(), pendingInterim]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!trimmed) {
    toast.error(ctx.t("course_interview.errors.answer_required"));
    return;
  }

  // No room, no turn. The chat hook is mounted by the workspace screen (the only
  // component inside the room provider), so a null bridge means the room has not
  // come up — there is no second door to fall through any more.
  const chat = ctx.chatBridge.current;
  if (!chat) {
    toast.error(ctx.t("course_interview.errors.send_failed_livekit"));
    return;
  }

  const questionId = ctx.currentQuestion.id;
  // Stable submission id doubles as the transcript turn id and the control
  // stream's `turn_key`, so a retry reuses it and never double-inserts.
  const submissionId = options.retrySubmissionId ?? newTurnKey();
  ctx.beginSubmit(submissionId, trimmed);

  try {
    await sendTurnViaLiveKit(ctx, chat, {
      text: trimmed,
      turnKey: submissionId,
      questionId,
    });
  } catch (err) {
    reportAnswerFailure(ctx, {
      message:
        (err as Error).message ||
        ctx.t("course_interview.errors.send_failed_livekit"),
      trimmed,
    });
  }
}
