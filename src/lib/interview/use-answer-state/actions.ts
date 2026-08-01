/**
 * One handler per `AnswerAction` type.
 *
 * `answerReducer` used to be a single switch carrying every guard and every
 * transition, which put its branch count far past the complexity budget. The
 * transitions are UNCHANGED — each `case` body moved verbatim into the handler
 * below it, and the reducer now only routes on `action.type`.
 */

import {
  createInitialAnswerState,
  type AnswerAction,
  type AnswerState,
} from "@/lib/interview/use-answer-state/state";

type ActionOf<T extends AnswerAction["type"]> = Extract<
  AnswerAction,
  { type: T }
>;

export function resetForQuestion(
  state: AnswerState,
  action: ActionOf<"reset">,
): AnswerState {
  // A genuinely new question resets everything keyed by the new id.
  // Guard: re-dispatching reset for the SAME question (e.g. an unrelated
  // rerender that recomputes the id) must NOT wipe an in-progress draft.
  if (action.questionId === state.questionId) return state;
  return createInitialAnswerState(action.questionId);
}

export function editDraft(
  state: AnswerState,
  action: ActionOf<"editDraft">,
): AnswerState {
  // Editing is only meaningful before/around submission. While submitting,
  // ignore edits (composer is disabled) so we can't race the request.
  if (state.status === "submitting" || state.status === "submitted")
    return state;
  return {
    ...state,
    draft: action.draft,
    // Typing after a failure returns to a clean draft state, clearing the
    // error banner but preserving the recovered content.
    status: state.status === "failed" ? "draft" : state.status,
    error: state.status === "failed" ? null : state.error,
  };
}

export function startRecording(state: AnswerState): AnswerState {
  if (state.status === "submitting" || state.status === "submitted")
    return state;
  return { ...state, status: "recording", error: null };
}

export function stopRecording(
  state: AnswerState,
  action: ActionOf<"stopRecording">,
): AnswerState {
  if (state.status !== "recording") return state;
  return {
    ...state,
    status: "draft",
    draft: action.draft ?? state.draft,
  };
}

export function review(
  state: AnswerState,
  action: ActionOf<"review">,
): AnswerState {
  if (state.status === "submitting" || state.status === "submitted")
    return state;
  return {
    ...state,
    status: "reviewing",
    draft: action.draft ?? state.draft,
    error: null,
  };
}

export function submit(
  state: AnswerState,
  action: ActionOf<"submit">,
): AnswerState {
  // Prevent duplicate submissions: only a draft/reviewing/recording/failed
  // answer can transition into `submitting`. A second submit while one is
  // already in flight is a no-op.
  if (state.status === "submitting" || state.status === "submitted")
    return state;
  return {
    ...state,
    status: "submitting",
    draft: action.draft ?? state.draft,
    error: null,
    submissionId: action.submissionId,
  };
}

export function submitSuccess(
  state: AnswerState,
  action: ActionOf<"submitSuccess">,
): AnswerState {
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

export function submitFailure(
  state: AnswerState,
  action: ActionOf<"submitFailure">,
): AnswerState {
  if (state.status !== "submitting") return state;
  // Preserve the draft so the candidate never loses their answer; expose
  // retry via the `failed` status. The submissionId is retained so a retry
  // reuses the same idempotency key and cannot create a duplicate.
  return { ...state, status: "failed", error: action.error };
}

export function restoreDraft(
  state: AnswerState,
  action: ActionOf<"restoreDraft">,
): AnswerState {
  // The submitted text was NOT a real answer (e.g. a natural-language end
  // request that the backend turned into an end-confirmation). Roll back to
  // a clean draft with the content restored so it never becomes a
  // transcript entry, and the candidate keeps their text if they continue.
  if (state.status !== "submitting") return state;
  return {
    ...state,
    status: "draft",
    draft: action.draft ?? state.draft,
    error: null,
    submissionId: undefined,
  };
}

export function reopen(state: AnswerState): AnswerState {
  // The AI asked a follow-up / clarification / hint on the SAME question
  // (no new questionId), so the candidate must answer again. Return to a
  // clean draft on the current question while keeping `submittedAnswer` so
  // the prior confirmation can collapse rather than vanish.
  if (state.status !== "submitted") return state;
  return { ...state, status: "draft", draft: "", error: null };
}
