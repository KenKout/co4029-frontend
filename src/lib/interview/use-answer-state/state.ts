/**
 * The answer state shape and its initial value.
 *
 * Split out of `use-answer-state.ts` so the per-action handlers in `./actions`
 * can import the type and the factory without a cycle back through the hook
 * module. `use-answer-state.ts` re-exports every name here, so the public
 * surface is unchanged.
 */

export type AnswerSubmissionStatus =
  | "draft"
  | "recording"
  | "reviewing"
  | "submitting"
  | "submitted"
  | "failed";

export interface AnswerState {
  /** The question this answer belongs to; a new id resets the machine. */
  questionId: string;
  /** Current editable content (typed text or live/edited voice transcript). */
  draft: string;
  /** Latest successfully-submitted answer, kept for the confirmation card. */
  submittedAnswer: string | null;
  status: AnswerSubmissionStatus;
  error: string | null;
  /** Stable id for the in-flight/confirmed submission (transcript dedup key). */
  submissionId?: string;
}

export type AnswerAction =
  | { type: "reset"; questionId: string }
  | { type: "editDraft"; draft: string }
  | { type: "startRecording" }
  | { type: "stopRecording"; draft?: string }
  | { type: "review"; draft?: string }
  | { type: "submit"; submissionId: string; draft?: string }
  | { type: "submitSuccess"; submittedAnswer?: string }
  | { type: "submitFailure"; error: string }
  | { type: "restoreDraft"; draft?: string }
  | { type: "reopen" };

export function createInitialAnswerState(questionId: string): AnswerState {
  return {
    questionId,
    draft: "",
    submittedAnswer: null,
    status: "draft",
    error: null,
    submissionId: undefined,
  };
}
