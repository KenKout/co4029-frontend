import { useCallback, useRef, useState } from "react";

import type {
  ConversationTurn,
  InterviewQuestionView,
} from "@/lib/interview/types";
import { useAnswerState } from "@/lib/interview/use-answer-state";

/**
 * The current turn: question, transcript, answer draft and the structured
 * answer-submission state machine. Second hook group in the page's hook order
 * (see use-course-interview.ts) — moved verbatim from course-interview.tsx.
 */
export function useInterviewTurnState() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] =
    useState<InterviewQuestionView | null>(null);
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [answerText, setAnswerText] = useState("");
  // Structured submission status for the CURRENT question's answer (spec §7):
  // governs submitting/submitted/failed guards, keeps the draft recoverable on
  // failure, and prevents duplicate submissions. Keyed by question id so a new
  // question resets it while unrelated rerenders never wipe the draft.
  const answer = useAnswerState(currentQuestion?.id ?? "__none__");
  const {
    resetForQuestion: resetAnswerForQuestion,
    reopenForFollowUp,
    beginSubmit,
    submitSucceeded,
    submitFailed,
    restoreDraft,
    lateSubmitFailure,
  } = answer;
  // End-confirmation gate (Slice 4): true after the interviewer asks the
  // candidate to confirm ending (backend `pending_confirmation`). While true
  // the main screen shows Continue / End-and-submit controls, the draft + timer
  // are preserved, and ordinary answer submission is disabled. `endConfirmPrompt`
  // holds the interviewer's confirmation utterance to display.
  const [endConfirming, setEndConfirming] = useState(false);
  const [endConfirmPrompt, setEndConfirmPrompt] = useState("");
  // The most recently acknowledged answer, shown as a compact confirmation on
  // the main screen (spec §8). Persists across the transition to the next
  // question so it can collapse into "✓ Previous answer submitted" rather than
  // vanishing without feedback.
  const [recentSubmission, setRecentSubmission] = useState<{
    answer: string;
    questionId: string;
    submissionId: string;
  } | null>(null);

  // Turn keys the server has CONFIRMED durable (snapshot.confirmedTurnKey).
  // The late-FAILED path refuses to touch any key in this set: a settled turn
  // cannot retroactively fail. A ref, not state — it is consulted by event
  // handlers, never rendered.
  const confirmedTurnKeys = useRef<Set<string>>(new Set());
  const markTurnConfirmed = useCallback((turnKey: string) => {
    confirmedTurnKeys.current.add(turnKey);
  }, []);

  /**
   * The parked sent-draft text for a turn key, or null.
   *
   * Scans this session's `:sent` slots (any question) for the versioned record
   * whose turnKey matches — the same record a matching confirmation would
   * clear. A key with no parked copy has no candidate copy to restore, so the
   * late-FAILED handler ignores it.
   */
  const parkedSentDraftText = useCallback(
    (turnKey: string): string | null => {
      const sid = sessionId;
      if (!sid) return null;
      const prefix = `abridge:iv-draft:${sid}:`;
      try {
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const key = window.localStorage.key(i);
          if (!key || !key.startsWith(prefix) || !key.endsWith(":sent")) continue;
          const raw = window.localStorage.getItem(key);
          if (!raw || !raw.trimStart().startsWith("{")) continue;
          try {
            const parsed: unknown = JSON.parse(raw);
            if (
              typeof parsed === "object" &&
              parsed !== null &&
              "turnKey" in parsed &&
              (parsed as { turnKey: unknown }).turnKey === turnKey &&
              "text" in parsed &&
              typeof (parsed as { text: unknown }).text === "string"
            ) {
              return (parsed as { text: string }).text;
            }
          } catch {
            /* unreadable record — skip */
          }
        }
      } catch {
        /* storage unavailable */
      }
      return null;
    },
    [sessionId],
  );

  /**
   * Surface a post-ACK fold failure as a RETRYABLE failed state.
   *
   * ONE atomic reducer transition (`lateSubmitFailure`) restores the exact
   * parked draft, the retryable error and the turn key — chaining
   * `restoreDraft()` then `submitFailed()` let an interleaved dispatch drop
   * the restored text or fail the wrong question. The turn key stays the next
   * submission's idempotency key (the server-side receipt reclaim makes that
   * redelivery safe).
   */
  const submitFailedForRetry = useCallback(
    (text: string, turnKey: string) => {
      const current = answer.state;
      lateSubmitFailure({
        questionId: current.questionId,
        draft: text,
        error: "fold_failed_retryable",
        submissionId: turnKey,
      });
      setAnswerText(text);
      retrySubmissionIdRef.current = turnKey;
    },
    [answer.state, lateSubmitFailure, setAnswerText],
  );

  // The turn key a RETRY must reuse (failed fold / rejected send). Cleared on
  // a fresh submission. Read by the answer actions to keep the key stable.
  const retrySubmissionIdRef = useRef<string | null>(null);

  return {
    sessionId,
    setSessionId,
    currentQuestion,
    setCurrentQuestion,
    transcript,
    setTranscript,
    answerText,
    setAnswerText,
    answer,
    resetAnswerForQuestion,
    reopenForFollowUp,
    beginSubmit,
    submitSucceeded,
    submitFailed,
    restoreDraft,
    endConfirming,
    setEndConfirming,
    endConfirmPrompt,
    setEndConfirmPrompt,
    recentSubmission,
    setRecentSubmission,
    confirmedTurnKeys,
    markTurnConfirmed,
    parkedSentDraftText,
    submitFailedForRetry,
    retrySubmissionIdRef,
  };
}
