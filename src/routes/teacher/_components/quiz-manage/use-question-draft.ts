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
}

export function useQuestionDraft(
  question: QuizQuestionAuthoring,
  onDirtyChange?: (questionId: string, dirty: boolean) => void,
): QuestionDraftState {
  const [draft, setDraft] = useState(() => buildQuestionDraft(question));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraft(buildQuestionDraft(question));
  }, [question]);

  // Local edits not yet PATCHed.
  //
  // The baseline deliberately uses the RAW saved expected time, not
  // buildQuestionDraft's defaulted one. buildQuestionDraft pre-fills
  // DEFAULT_EXPECTED_SECONDS when the saved value is null, so comparing against
  // it would cancel the default out on both sides — the field would look
  // populated while the row stayed null, and the question wouldn't register as
  // unsaved. Baselining on the raw value makes that pre-filled default show up
  // as exactly what it is: an unsaved local edit.
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

  // Report dirtiness up so the navigator can show a Saved/Unsaved badge. The
  // draft itself stays local to the card (lifting it would re-render every
  // sibling card on each keystroke).
  useEffect(() => {
    onDirtyChange?.(question.id, isUnsaved);
  }, [question.id, isUnsaved, onDirtyChange]);

  // Unmount cleanup: a card that scrolls out of the list (or is deleted) must
  // not leave a stale "unsaved" flag behind in the parent.
  useEffect(
    () => () => {
      onDirtyChange?.(question.id, false);
    },
    [question.id, onDirtyChange],
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
  const blankCount =
    question.question_type === "fill_blank"
      ? countBlanks(question.prompt_text ?? "")
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
  };
}
