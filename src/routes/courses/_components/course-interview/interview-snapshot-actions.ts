import type { StateSnapshot } from "@/lib/interview/control-protocol";
import { makeAiTurn } from "@/lib/interview/turn-factory";
import type { InterviewQuestionView } from "@/lib/interview/types";
import type { InterviewActionsContext } from "./types";

/**
 * Apply one server snapshot from `abridge.interview.control`.
 *
 * The snapshot is ABSOLUTE — never a delta — so this replaces the client's view
 * wholesale rather than merging. Ordering is already settled upstream: the chat
 * hook drops anything whose `seq` is not newer than what it has applied, so by
 * the time this runs the snapshot is the freshest state that exists.
 *
 * Synchronous on purpose: it is called from inside a LiveKit text-stream handler,
 * so `beginClosing` is fired rather than awaited.
 */
export function applyStateSnapshot(
  ctx: InterviewActionsContext,
  snapshot: StateSnapshot,
): void {
  ctx.reconcileDeadline({
    hasTimeLimit: snapshot.hasTimeLimit,
    timeRemainingSeconds: snapshot.timeRemainingSeconds,
  });
  ctx.setSessionProgress({
    questionNumber: snapshot.questionNumber,
    questionsRemaining: snapshot.questionsRemaining,
    questionsTotal: snapshot.questionsTotal,
    outcomesCovered: snapshot.outcomesCovered,
    outcomesRequired: snapshot.outcomesRequired,
  });

  if (snapshot.isFinished) {
    // `beginClosing` is itself idempotent (it returns early once the phase is
    // closing/results), so a repeated finished snapshot cannot re-finish.
    void ctx.beginClosing("natural");
    return;
  }

  const question = snapshotQuestion(snapshot);
  if (!question) return;
  if (isAlreadyPresenting(ctx, question.id)) return;
  // The onboarding handoff owns the FIRST reveal: it parks the question in
  // `pendingFirstQuestion` so the client can narrate the server-authored
  // transition line the agent never receives. Touching either of these would
  // race that beat, and the join snapshot names the same question anyway.
  if (ctx.pendingFirstQuestion || !ctx.currentQuestion) return;

  presentNextQuestion(ctx, question);
}

function snapshotQuestion(
  snapshot: StateSnapshot,
): InterviewQuestionView | null {
  const { currentQuestionId, currentQuestionText } = snapshot;
  if (!currentQuestionId || !currentQuestionText) return null;
  return {
    id: currentQuestionId,
    prompt_text: currentQuestionText,
    question_type: null,
  };
}

function isAlreadyPresenting(
  ctx: InterviewActionsContext,
  questionId: string,
): boolean {
  return (
    ctx.currentQuestion?.id === questionId ||
    ctx.pendingNextQuestion?.id === questionId ||
    ctx.pendingFirstQuestion?.id === questionId
  );
}

/**
 * Reveal the next question directly.
 *
 * No client-authored transition beat: the agent speaks its own bridge ("Thanks,
 * Duy. Now, imagine…") and that arrives as transcription, so inserting the
 * localized `transitions.next_question` line put a sentence on screen that the
 * interviewer never said — and said something different from what was heard.
 *
 * Snapshots exist only on the native path, so there is always an agent to voice
 * the bridge; the routed path still parks a transition via `pendingNextQuestion`.
 *
 * The question is ALSO committed to the transcript, because the pinned card is
 * the last AI turn in it — not `currentQuestion`. Setting only `currentQuestion`
 * advanced the "n of 3" counter while the card kept showing question one, and the
 * knock-on was worse than the stale card: the stage dates its "is this a probe?"
 * window from the card's turn, so the agent's reading of the NEW question landed
 * after the OLD question's answer and was labelled FOLLOW-UP.
 */
function presentNextQuestion(
  ctx: InterviewActionsContext,
  question: InterviewQuestionView,
): void {
  ctx.setCurrentQuestion(question);
  ctx.setPhase("questioning");
  ctx.setTranscript((previous) => {
    const turn = makeAiTurn(question, false, ctx.currentElapsedSeconds());
    return previous.some((existing) => existing.id === turn.id)
      ? previous
      : [...previous, turn];
  });
}
