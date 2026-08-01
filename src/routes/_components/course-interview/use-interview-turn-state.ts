import { useState } from "react";

import type { InterviewQuestionPublic } from "@/lib/api/types";
import type { ConversationTurn } from "@/lib/interview/types";
import { useAnswerState } from "@/lib/interview/use-answer-state";

/**
 * The current turn: question, transcript, answer draft and the structured
 * answer-submission state machine. Second hook group in the page's hook order
 * (see use-course-interview.ts) — moved verbatim from course-interview.tsx.
 */
export function useInterviewTurnState() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] =
    useState<InterviewQuestionPublic | null>(null);
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
  };
}
