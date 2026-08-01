import { useCallback, useReducer } from "react";

import * as handle from "@/lib/interview/use-answer-state/actions";
import {
  createInitialAnswerState,
  type AnswerAction,
  type AnswerState,
  type AnswerSubmissionStatus,
} from "@/lib/interview/use-answer-state/state";

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
 *
 * The state shape lives in `./use-answer-state/state` and one handler per
 * action in `./use-answer-state/actions`; every name is re-exported here, so
 * this module's public surface is unchanged.
 */

export type { AnswerState, AnswerSubmissionStatus, AnswerAction };
export { createInitialAnswerState };

export function answerReducer(
  state: AnswerState,
  action: AnswerAction,
): AnswerState {
  switch (action.type) {
    case "reset":
      return handle.resetForQuestion(state, action);
    case "editDraft":
      return handle.editDraft(state, action);
    case "startRecording":
      return handle.startRecording(state);
    case "stopRecording":
      return handle.stopRecording(state, action);
    case "review":
      return handle.review(state, action);
    case "submit":
      return handle.submit(state, action);
    case "submitSuccess":
      return handle.submitSuccess(state, action);
    case "submitFailure":
      return handle.submitFailure(state, action);
    case "restoreDraft":
      return handle.restoreDraft(state, action);
    case "reopen":
      return handle.reopen(state);
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
  restoreDraft: (draft?: string) => void;
  resetForQuestion: (questionId: string) => void;
  reopenForFollowUp: () => void;
}

export function useAnswerState(questionId: string): UseAnswerStateResult {
  const [state, dispatch] = useReducer(
    answerReducer,
    questionId,
    createInitialAnswerState,
  );

  const setDraft = useCallback(
    (draft: string) => dispatch({ type: "editDraft", draft }),
    [],
  );
  const startRecording = useCallback(
    () => dispatch({ type: "startRecording" }),
    [],
  );
  const stopRecording = useCallback(
    (draft?: string) => dispatch({ type: "stopRecording", draft }),
    [],
  );
  const review = useCallback(
    (draft?: string) => dispatch({ type: "review", draft }),
    [],
  );
  const beginSubmit = useCallback(
    (submissionId: string, draft?: string) =>
      dispatch({ type: "submit", submissionId, draft }),
    [],
  );
  const submitSucceeded = useCallback(
    (submittedAnswer?: string) =>
      dispatch({ type: "submitSuccess", submittedAnswer }),
    [],
  );
  const submitFailed = useCallback(
    (error: string) => dispatch({ type: "submitFailure", error }),
    [],
  );
  const restoreDraft = useCallback(
    (draft?: string) => dispatch({ type: "restoreDraft", draft }),
    [],
  );
  const resetForQuestion = useCallback(
    (nextQuestionId: string) =>
      dispatch({ type: "reset", questionId: nextQuestionId }),
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
    restoreDraft,
    resetForQuestion,
    reopenForFollowUp,
  };
}
