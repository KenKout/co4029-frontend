import type { ReactNode } from "react";

import type { NarrationPresentation } from "@/lib/hooks/use-interview-narration";
import type {
  ConversationTurn,
  InterviewAgentStatus,
} from "@/lib/interview/types";

/**
 * Shared prop contracts for the interview stage components, extracted verbatim
 * from the former single-file stages.tsx so the orchestrator and its
 * sub-components agree on one definition.
 */

/** Narration entry point the stages hand text to; may be sync, a promise, or a
 * cancellable presentation handle. */
export type StageSpeak = (
  text: string,
) => void | Promise<void> | NarrationPresentation;

/** Maps a raw question type onto its localized label, or null when unknown. */
export type QuestionTypeLabel = (
  type: string | null | undefined,
) => string | null;

export type InterviewHeaderProps = {
  slug: string;
  courseName: string;
  interviewTitle: string;
  elapsed: string;
  timerActive?: boolean;
  /** Epoch ms when the assessed timer started; drives the time-based progress
   * fallback used when the question total is unknown (always, on the learner
   * API). Null before the assessment begins. */
  assessmentStartedAtMs?: number | null;
  expectedDurationMinutes?: number | null;
  currentQuestion?: number | null;
  totalQuestions?: number | null;
  connected?: boolean;
  voiceOn: boolean;
  onToggleVoice: () => void;
  onEndInterview?: () => void;
  /** Disable the end button (e.g. while the closing is already underway). */
  endInterviewDisabled?: boolean;
  showVoiceControl?: boolean;
  /** Whole seconds spent on the current question; null hides the per-question cue. */
  questionElapsed?: number | null;
  /** True once past the lingering threshold — switches the cue to a gentle nudge. */
  questionLingering?: boolean;
};

export type QuestionCardProps = {
  turn: ConversationTurn;
  questionNumber: number;
  totalQuestions?: number | null;
  category?: string | null;
  speak: StageSpeak;
  onSpeakingChange: (speaking: boolean) => void;
  onPresentationComplete: () => void;
  onReplay: () => void;
  onClarify?: () => void;
  animate?: boolean;
  replayDisabled?: boolean;
  clarificationDisabled?: boolean;
  isReplaying?: boolean;
};

export type FocusedInterviewStageProps = {
  transcript: ConversationTurn[];
  status: InterviewAgentStatus;
  transcriptOpen: boolean;
  onTranscriptOpenChange: (open: boolean) => void;
  assessmentActive: boolean;
  currentQuestionNumber: number;
  totalQuestions?: number | null;
  currentQuestionType?: string | null;
  isUserTyping: boolean;
  questionTypeLabel: QuestionTypeLabel;
  speak: StageSpeak;
  /**
   * Replay narrator, when it differs from `speak` (a live-LiveKit session:
   * the agent is the voice for new turns, but replay is user-initiated and
   * must still narrate client-side). Defaults to `speak`.
   */
  replaySpeak?: StageSpeak;
  onSpeakingChange: (speaking: boolean) => void;
  onTurnPresented?: (turn: ConversationTurn) => void;
  onClarifyQuestion?: () => void;
  onRequestHint?: () => void;
  onExplainTerm?: (term: string) => void;
  onRetry?: () => void;
  statusMessage?: string;
  activeTurnActions?: ReactNode;
  activeTurnActionsVisible?: boolean;
  replayAvailable?: boolean;
  /** Secondary confirmation for the most recently submitted answer (spec §8). */
  submissionSlot?: ReactNode;
  /** When the desktop docked transcript panel is open, hide the in-composer
   * transcript trigger so it isn't duplicated. */
  transcriptDocked?: boolean;
};
