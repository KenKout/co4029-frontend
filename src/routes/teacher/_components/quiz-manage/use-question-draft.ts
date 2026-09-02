import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { QuizQuestionAuthoring } from "@/lib/api/types";
import { buildQuestionDraft, countBlanks, readCorrectAnswer } from "./helpers";
import type { QuestionDraft } from "./types";

/**
 * Local draft state for one QuestionCard, plus every value derived from it.
 *
 * Extracted from QuestionCard so the card itself is pure composition. The hook
 * call order here matches the order the card used inline (draft state →
 * confirm-delete state → resync effect → unsaved memo → dirty-report effect →
 * unmount cleanup effect), so React sees exactly the same sequence.
 */

export interface QuestionDraftState {
  draft: QuestionDraft;
  setDraft: Dispatch<SetStateAction<QuestionDraft>>;
  confirmDelete: boolean;
  setConfirmDelete: Dispatch<SetStateAction<boolean>>;
  hasOptions: boolean;
  allowMultiCorrect: boolean;
  correctAnswer: string | string[] | null;
  blankCount: number;
  expectedSeconds: number | null;
  draftTimeInvalid: boolean;
  /** Draft differs from the stored row — drives the card's "Unsaved" badge. */
  isUnsaved: boolean;
}

export function useQuestionDraft(
  question: QuizQuestionAuthoring,
  onDirtyChange?: (questionId: string, dirty: boolean) => void,
  /** Reports EXPLICIT teacher edits only — the leave-guard's input. */
  onUserEditChange?: (questionId: string, edited: boolean) => void,
  /**
   * Bumped by the quiz-level "Discard" to throw the draft away and re-read the
   * stored row. It is a token rather than a boolean so repeated discards each
   * fire: the value only has to CHANGE, and the effect below already knows how
   * to rebuild from `question`.
   */
  resetToken = 0,
): QuestionDraftState {
  const [draft, setDraft] = useState(() => buildQuestionDraft(question));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraft(buildQuestionDraft(question));
  }, [question, resetToken]);

  // TWO distinct notions of "not saved", deliberately kept apart. Collapsing
  // them into one flag is what produced "31 unsaved" on a quiz nobody had
  // touched.
  //
  // `isUnsaved` — the editor's state differs from the stored ROW. Baselined on
  // the RAW saved expected time, so buildQuestionDraft's pre-filled
  // DEFAULT_EXPECTED_SECONDS shows up as exactly what it is: a value on screen
  // that the database does not have. This drives the amber "unsaved default
  // time" banner, its one-click bulk Save, and the navigator's rule that such
  // a question is not an *error*.
  const isUnsaved = useMemo(() => {
    const savedSeconds =
      question.expected_response_time_ms == null
        ? null
        : Math.round(question.expected_response_time_ms / 1000);
    const savedBaseline = {
      ...buildQuestionDraft(question),
      expected_response_seconds: savedSeconds,
    };
    return JSON.stringify(draft) !== JSON.stringify(savedBaseline);
  }, [draft, question]);

  // `hasUserEdits` — the TEACHER actually changed something. Baselined on the
  // DEFAULTED draft, so a pre-fill cancels out on both sides. Only this may
  // arm the leave-guard: merely opening the Questions tab must not claim there
  // is work to lose (PRD FR-033).
  const hasUserEdits = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(buildQuestionDraft(question)),
    [draft, question],
  );

  // Report dirtiness up so the navigator can show a Saved/Unsaved badge. The
  // draft itself stays local to the card (lifting it would re-render every
  // sibling card on each keystroke).
  useEffect(() => {
    onDirtyChange?.(question.id, isUnsaved);
  }, [question.id, isUnsaved, onDirtyChange]);

  useEffect(() => {
    onUserEditChange?.(question.id, hasUserEdits);
  }, [question.id, hasUserEdits, onUserEditChange]);

  // Unmount cleanup: a card that scrolls out of the list (or is deleted) must
  // not leave a stale "unsaved" flag behind in the parent.
  useEffect(
    () => () => {
      onDirtyChange?.(question.id, false);
      onUserEditChange?.(question.id, false);
    },
    [question.id, onDirtyChange, onUserEditChange],
  );

  const hasOptions =
    (question.question_type === "multiple_choice" ||
      question.question_type === "true_false") &&
    draft.options.length > 0;
  // Phase 7: multi-select is MCQ-only (true_false is always single-answer).
  // Read the DRAFT flag, not the saved row, so flipping the toggle switches the
  // option inputs to checkboxes immediately — before the teacher hits Save.
  const allowMultiCorrect =
    question.question_type === "multiple_choice" && !draft.single_answer;
  const correctAnswer = readCorrectAnswer(question);
  // Blank count follows the DRAFT prompt, not the saved row — typing ___ in
  // the prompt adds the matching answer input immediately, no intermediate
  // save needed. (The draft prompt is what the teacher sees and edits.)
  const blankCount =
    question.question_type === "fill_blank"
      ? countBlanks(draft.prompt_text ?? "")
      : 0;
  const expectedSeconds =
    question.expected_response_time_ms == null
      ? null
      : Math.round(question.expected_response_time_ms / 1000);
  // Live validity of the DRAFT value, for inline field feedback while typing.
  // Distinct from hasInvalidExpectedTime(question), which reflects the SAVED
  // row and drives the navigator's error state.
  const draftTimeInvalid =
    draft.expected_response_seconds == null ||
    !Number.isFinite(draft.expected_response_seconds) ||
    draft.expected_response_seconds <= 0;

  return {
    draft,
    setDraft,
    confirmDelete,
    setConfirmDelete,
    hasOptions,
    allowMultiCorrect,
    correctAnswer,
    blankCount,
    expectedSeconds,
    draftTimeInvalid,
    isUnsaved,
  };
}
