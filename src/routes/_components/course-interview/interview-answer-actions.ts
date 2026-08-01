import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import {
  endConfirmationPrompt,
  isAwaitingEndConfirmation,
  isClosingTurn,
} from "@/lib/interview/end-confirmation";
import { planTransition } from "@/lib/interview/transition-sequencing";
import {
  makeCeremonyTurn,
  makeFollowUpTurn,
  makeUserTurn,
  newTurnKey,
} from "@/lib/interview/turn-factory";
import { resolveAssistanceTurnKind } from "./helpers";
import type { InterviewActionsContext } from "./types";

/**
 * The candidate's answer-submission lifecycle, lifted verbatim out of
 * course-interview.tsx with the page closure passed explicitly as `ctx`.
 */

type RespondResult = Awaited<
  ReturnType<InterviewActionsContext["respond"]["mutateAsync"]>
>;

/**
 * End-confirmation gate (Slice 4): the backend recognised this as a
 * natural-language end request and is asking the candidate to confirm
 * rather than closing. It is NOT an answer — roll the editor back to a
 * preserved draft (no transcript entry, no advance), and surface the
 * Continue / End-and-submit controls. The question + timer stay intact.
 */
function applyEndConfirmation(
  ctx: InterviewActionsContext,
  result: RespondResult,
  trimmed: string,
) {
  ctx.restoreDraft(trimmed);
  ctx.setAnswerText(trimmed);
  ctx.setEndConfirmPrompt(
    endConfirmationPrompt(result, ctx.t("course_interview.end_confirm.prompt")),
  );
  ctx.setEndConfirming(true);
}

/**
 * Server acknowledged — NOW commit to the transcript (spec: add only
 * after successful backend acknowledgement), deduped by submissionId so
 * a retry that reuses the id can't create a second entry.
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
  // The answer is committed server-side — drop its autosaved draft (#2).
  ctx.clearDraftAutosave();
  // Editor content is cleared ONLY after the server acknowledged (spec §2);
  // the compact confirmation now stands in for the answer on the main screen.
  ctx.setAnswerText("");
  ctx.setRecentSubmission({ answer: trimmed, questionId, submissionId });
}

function resolveStandaloneText(result: RespondResult, isAdvance: boolean) {
  return !isAdvance && (result.ai_turn_text || result.ai_followup_text)
    ? result.ai_turn_text || result.ai_followup_text!
    : result.ai_followup_text || null;
}

/**
 * Rich-closing sub-step (self-reflection / invite-questions): NON-
 * assessed ceremony. Tag it `kind: "closing"` so the transcript
 * groups it under a "Wrap-up" section (never "Question N"), and flag
 * the ceremony so the composer offers a Skip-and-finish control.
 */
function appendClosingCeremonyTurn(
  ctx: InterviewActionsContext,
  args: { standaloneText: string; submissionId: string },
) {
  const { standaloneText, submissionId } = args;
  ctx.setTranscript((prev) => [
    ...prev,
    {
      id: `c-${submissionId}`,
      role: "ai",
      text: standaloneText,
      elapsedSeconds: ctx.currentElapsedSeconds(),
      kind: "closing",
    },
  ]);
  ctx.setClosingCeremonyActive(true);
  ctx.reopenForFollowUp();
}

function appendFollowUpForAnswer(
  ctx: InterviewActionsContext,
  args: {
    result: RespondResult;
    standaloneText: string;
    submissionId: string;
    isAdvance: boolean;
  },
) {
  const { result, standaloneText, submissionId, isAdvance } = args;
  const assistanceTurnKind = resolveAssistanceTurnKind(result.assistance_kind);
  ctx.setTranscript((prev) => [
    ...prev,
    makeFollowUpTurn(
      standaloneText,
      `${submissionId}-fu`,
      ctx.currentElapsedSeconds(),
      assistanceTurnKind,
    ),
  ]);
  // A probe/clarification on the SAME question re-opens the answer so
  // the candidate can respond again; the confirmation collapses to
  // "previous".
  if (!isAdvance) ctx.reopenForFollowUp();
}

/**
 * Final-question transition first; handleTurnPresented then runs the
 * existing finish flow so the separate goodbye follows (two turns).
 */
function presentFinalTransition(
  ctx: InterviewActionsContext,
  args: { text: string; submissionId: string },
) {
  const { text, submissionId } = args;
  ctx.setPhase("transition");
  ctx.setPendingFinalTransition(true);
  ctx.setTranscript((prev) => [
    ...prev,
    makeCeremonyTurn(
      "transition",
      text,
      `${submissionId}-final`,
      ctx.currentElapsedSeconds(),
    ),
  ]);
}

/**
 * Show + narrate the transition, hold the next Question Card in
 * pendingNextQuestion, and keep the composer hidden (phase="transition")
 * until the transition finishes presenting (handleTurnPresented reveals
 * the card — it never appears alongside its transition).
 */
function presentNextQuestionTransition(
  ctx: InterviewActionsContext,
  args: {
    nextQuestion: NonNullable<RespondResult["next_question"]>;
    text: string;
    submissionId: string;
  },
) {
  const { nextQuestion, text, submissionId } = args;
  ctx.setPendingNextQuestion(nextQuestion);
  ctx.setPhase("transition");
  ctx.setTranscript((prev) => [
    ...prev,
    makeCeremonyTurn(
      "transition",
      text,
      `${submissionId}-transition`,
      ctx.currentElapsedSeconds(),
    ),
  ]);
}

/**
 * Preserve the draft and expose retry (spec §3). No transcript entry was
 * added, the question/timer are untouched, and we do NOT advance.
 */
function reportAnswerFailure(
  ctx: InterviewActionsContext,
  err: unknown,
  trimmed: string,
) {
  ctx.submitFailed(
    err instanceof ApiError && err.status === 429
      ? ctx.t("course_interview.errors.rate_limited")
      : (err as Error).message || ctx.t("course_interview.errors.send_failed"),
  );
  ctx.setAnswerText(trimmed);
  if (err instanceof ApiError && err.status === 429) {
    toast.error(ctx.t("course_interview.errors.rate_limited"));
  } else {
    toast.error(
      (err as Error).message || ctx.t("course_interview.errors.send_failed"),
    );
  }
}

async function applyRespondResult(
  ctx: InterviewActionsContext,
  args: {
    result: RespondResult;
    submissionId: string;
    trimmed: string;
    questionId: string;
  },
) {
  const { result, submissionId, trimmed, questionId } = args;
  // Re-anchor the timeout to the server's authoritative countdown (#4).
  ctx.reconcileDeadline(result.time_remaining_seconds);

  if (isAwaitingEndConfirmation(result)) {
    applyEndConfirmation(ctx, result, trimmed);
    return;
  }

  commitAnswerTurn(ctx, { submissionId, trimmed, questionId });

  const isAdvance = Boolean(result.next_question);
  const finished = Boolean(result.should_finish ?? result.is_finished);
  const standaloneText = resolveStandaloneText(result, isAdvance);

  if (standaloneText && !finished) {
    const closing = isClosingTurn(result);
    if (closing) {
      appendClosingCeremonyTurn(ctx, { standaloneText, submissionId });
    } else {
      appendFollowUpForAnswer(ctx, {
        result,
        standaloneText,
        submissionId,
        isAdvance,
      });
    }
  }

  // Decide the transition to present (spec §Frontend Sequencing + §ending).
  // Pure helper keeps the sequencing rules unit-testable and identical to
  // what ships. A null plan on a finished turn means no transition text was
  // available → close immediately (mixed-version safety).
  const plan = planTransition(
    result,
    ctx.t("course_interview.transitions.next_question"),
  );

  if (finished) {
    if (plan && plan.target === "closing") {
      presentFinalTransition(ctx, { text: plan.text, submissionId });
      return;
    }
    await ctx.beginClosing("natural");
    return;
  }

  if (result.next_question && plan && plan.target === "next_question") {
    presentNextQuestionTransition(ctx, {
      nextQuestion: result.next_question,
      text: plan.text,
      submissionId,
    });
  }
}

/**
 * Submit the candidate's answer through the structured lifecycle (spec §2/§7):
 *
 *  1. `submitting`  — draft preserved, submit disabled, one submission only.
 *  2. `submitted`   — ONLY after the server acknowledges: the answer is added
 *     to the transcript exactly once (deduped by submissionId), the compact
 *     confirmation replaces the editor, and the draft is cleared.
 *  3. `failed`      — the draft is preserved and retry is exposed; no
 *     transcript entry, no question advance, timer/question untouched.
 *
 * `retrySubmissionId` reuses the prior idempotency key so a retry after a
 * failure cannot create a duplicate transcript entry server- or client-side.
 */
export async function handleRespond(
  ctx: InterviewActionsContext,
  answerOverride?: string,
  options: { retrySubmissionId?: string } = {},
) {
  if (!ctx.currentQuestion || !ctx.sessionId || ctx.respond.isPending) return;
  // Guard against duplicate submissions from the state machine itself.
  if (
    ctx.answer.state.status === "submitting" ||
    ctx.answer.state.status === "submitted"
  ) {
    return;
  }
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

  const questionId = ctx.currentQuestion.id;
  // Stable submission id doubles as the transcript turn id and the server
  // idempotency key, so a retry reuses it and never double-inserts.
  const submissionId = options.retrySubmissionId ?? newTurnKey();
  ctx.beginSubmit(submissionId, trimmed);

  try {
    const result = await ctx.respond.mutateAsync({
      session_id: ctx.sessionId,
      session_question_id: questionId,
      answer_text: trimmed,
      turn_action: "answer",
      // Idempotency key so a network retry never double-inserts the answer
      // or re-runs the adaptive pipeline (adaptive safeguard #1). Legacy
      // backend ignores it harmlessly.
      turn_key: submissionId,
    });

    await applyRespondResult(ctx, {
      result,
      submissionId,
      trimmed,
      questionId,
    });
  } catch (err) {
    reportAnswerFailure(ctx, err, trimmed);
  }
}
