import { useCallback, useReducer } from "react";

/**
 * Structured answer-submission state machine (interview main-screen spec §7).
 *
 * Replaces the scattered booleans (`respond.isPending`, ad-hoc draft clearing,
 * transcript rollback) that previously governed the answer lifecycle with one
 * explicit state so the invalid combinations the spec calls out cannot occur:
 *
 *  - `submitted` while the request is still pending
 *  - a transcript entry created before the server acknowledged
 *  - the editor cleared on a failed request
 *  - two active submissions at once
 *
 * The reducer owns ONLY the answer/composer lifecycle. Confirmed transcript
 * entries stay in the route's `transcript` state (spec: "Keep optimistic UI
 * state separate from confirmed transcript state"), and the reducer never adds
 * to the transcript — the route does that on the `submitted` transition.
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

export function answerReducer(state: AnswerState, action: AnswerAction): AnswerState {
  switch (action.type) {
    case "reset": {
      // A genuinely new question resets everything keyed by the new id.
      // Guard: re-dispatching reset for the SAME question (e.g. an unrelated
      // rerender that recomputes the id) must NOT wipe an in-progress draft.
      if (action.questionId === state.questionId) return state;
      return createInitialAnswerState(action.questionId);
    }

    case "editDraft": {
      // Editing is only meaningful before/around submission. While submitting,
      // ignore edits (composer is disabled) so we can't race the request.
      if (state.status === "submitting" || state.status === "submitted") return state;
      return {
        ...state,
        draft: action.draft,
        // Typing after a failure returns to a clean draft state, clearing the
        // error banner but preserving the recovered content.
        status: state.status === "failed" ? "draft" : state.status,
        error: state.status === "failed" ? null : state.error,
      };
    }

    case "startRecording": {
      if (state.status === "submitting" || state.status === "submitted") return state;
      return { ...state, status: "recording", error: null };
    }

    case "stopRecording": {
      if (state.status !== "recording") return state;
      return {
        ...state,
        status: "draft",
        draft: action.draft ?? state.draft,
      };
    }

    case "review": {
      if (state.status === "submitting" || state.status === "submitted") return state;
      return {
        ...state,
        status: "reviewing",
        draft: action.draft ?? state.draft,
        error: null,
      };
    }

    case "submit": {
      // Prevent duplicate submissions: only a draft/reviewing/recording/failed
      // answer can transition into `submitting`. A second submit while one is
      // already in flight is a no-op.
      if (state.status === "submitting" || state.status === "submitted") return state;
      return {
        ...state,
        status: "submitting",
        draft: action.draft ?? state.draft,
        error: null,
        submissionId: action.submissionId,
      };
    }

    case "submitSuccess": {
      if (state.status !== "submitting") return state;
      const submitted = action.submittedAnswer ?? state.draft;
      return {
        ...state,
        status: "submitted",
        submittedAnswer: submitted,
        // Editor content is only cleared AFTER server acknowledgement.
        draft: "",
        error: null,
      };
    }

    case "submitFailure": {
      if (state.status !== "submitting") return state;
      // Preserve the draft so the candidate never loses their answer; expose
      // retry via the `failed` status. The submissionId is retained so a retry
      // reuses the same idempotency key and cannot create a duplicate.
      return { ...state, status: "failed", error: action.error };
    }

    case "reopen": {
      // The AI asked a follow-up / clarification / hint on the SAME question
      // (no new questionId), so the candidate must answer again. Return to a
      // clean draft on the current question while keeping `submittedAnswer` so
      // the prior confirmation can collapse rather than vanish.
      if (state.status !== "submitted") return state;
      return { ...state, status: "draft", draft: "", error: null };
    }

    default:
      return state;
  }
}

export interface UseAnswerStateResult {
  state: AnswerState;
  setDraft: (draft: string) => void;
  startRecording: () => void;
  stopRecording: (draft?: string) => void;
  review: (draft?: string) => void;
  beginSubmit: (submissionId: string, draft?: string) => void;
  submitSucceeded: (submittedAnswer?: string) => void;
  submitFailed: (error: string) => void;
  resetForQuestion: (questionId: string) => void;
  reopenForFollowUp: () => void;
}

export function useAnswerState(questionId: string): UseAnswerStateResult {
  const [state, dispatch] = useReducer(
    answerReducer,
    questionId,
    createInitialAnswerState,
  );

  const setDraft = useCallback((draft: string) => dispatch({ type: "editDraft", draft }), []);
  const startRecording = useCallback(() => dispatch({ type: "startRecording" }), []);
  const stopRecording = useCallback(
    (draft?: string) => dispatch({ type: "stopRecording", draft }),
    [],
  );
  const review = useCallback((draft?: string) => dispatch({ type: "review", draft }), []);
  const beginSubmit = useCallback(
    (submissionId: string, draft?: string) =>
      dispatch({ type: "submit", submissionId, draft }),
    [],
  );
  const submitSucceeded = useCallback(
    (submittedAnswer?: string) => dispatch({ type: "submitSuccess", submittedAnswer }),
    [],
  );
  const submitFailed = useCallback(
    (error: string) => dispatch({ type: "submitFailure", error }),
    [],
  );
  const resetForQuestion = useCallback(
    (nextQuestionId: string) => dispatch({ type: "reset", questionId: nextQuestionId }),
    [],
  );
  const reopenForFollowUp = useCallback(() => dispatch({ type: "reopen" }), []);

  return {
    state,
    setDraft,
    startRecording,
    stopRecording,
    review,
    beginSubmit,
    submitSucceeded,
    submitFailed,
    resetForQuestion,
    reopenForFollowUp,
  };
}
