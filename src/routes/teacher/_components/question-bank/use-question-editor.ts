import type {
  CheckDuplicateMutation,
  ConfirmFn,
  CreateQuestionMutation,
  TranslateFn,
  UpdateQuestionMutation,
} from "./types";
import { useDuplicateGuard } from "./use-duplicate-guard";
import { useQuestionAddDraft } from "./use-question-add-draft";
import { useQuestionEditDraft } from "./use-question-edit-draft";

/**
 * Authoring surface of the Question Bank: the inline edit draft, the
 * add-manual draft, and the duplicate-prompt guard both of them route their
 * saves through.
 *
 * These three were one tangle of `useState` + handlers inside the former
 * 2.4k-line question-bank.tsx. They are split into three hooks but composed
 * back together here because they are not independent: the guard holds the
 * *interrupted save* of whichever draft raised it, so a single guard instance
 * has to be shared by both drafts — giving the orchestrator two separate guards
 * would let an add-warning and an edit-warning be pending at once, which the
 * original single piece of state made impossible.
 *
 * `edit` is kept as a nested controller rather than spread flat: it is exactly
 * the object every question row consumes (`EditDraftController`), so handing it
 * over whole avoids re-listing eight fields at each call site.
 */
export interface QuestionEditorOptions {
  updateQuestion: UpdateQuestionMutation;
  createQuestion: CreateQuestionMutation;
  checkDuplicate: CheckDuplicateMutation;
  confirmAction: ConfirmFn;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSavingId: React.Dispatch<React.SetStateAction<string | null>>;
  t: TranslateFn;
}

export function useQuestionEditor(options: QuestionEditorOptions) {
  const {
    updateQuestion,
    createQuestion,
    checkDuplicate,
    confirmAction,
    setExpanded,
    setSavingId,
    t,
  } = options;

  const duplicateGuard = useDuplicateGuard({ checkDuplicate });
  const edit = useQuestionEditDraft({
    updateQuestion,
    duplicateGuard,
    confirmAction,
    setExpanded,
    setSavingId,
    t,
  });
  const add = useQuestionAddDraft({ createQuestion, duplicateGuard });

  return {
    // Add-manual draft, flattened: the orchestrator drives the inline form
    // directly from these, exactly as the original component did.
    adding: add.adding,
    setAdding: add.setAdding,
    newText: add.newText,
    setNewText: add.setNewText,
    newAnswer: add.newAnswer,
    setNewAnswer: add.setNewAnswer,
    handleAdd: add.handleAdd,
    cancelAdd: add.cancelAdd,
    // Per-row inline edit controller, passed through to the question list.
    edit,
    // The advisory duplicate verdict awaiting the teacher's call.
    duplicateWarning: duplicateGuard.duplicateWarning,
    dismissDuplicateWarning: duplicateGuard.dismiss,
    confirmDuplicateWarning: duplicateGuard.confirm,
  };
}

/** The composed authoring controller, as the orchestrator hands it around. */
export type QuestionEditorController = ReturnType<typeof useQuestionEditor>;
