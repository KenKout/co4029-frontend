import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PendingQuestionDelete } from "@/lib/api/hooks/quizzes";
import type {
  CourseLearningOutcomeAuthoring,
  QuizQuestionAuthoring,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { QuestionCardActions } from "./QuestionCardActions";
import { QuestionCardBody } from "./QuestionCardBody";
import { QuestionCardConfig } from "./QuestionCardConfig";
import { QuestionCardCorrectAnswer } from "./QuestionCardCorrectAnswer";
import { QuestionCardFillBlankDistractors } from "./QuestionCardFillBlankDistractors";
import { QuestionCardMetaRow } from "./QuestionCardMetaRow";
import { QuestionCardOptionsEditor } from "./QuestionCardOptionsEditor";
import { QuestionDeleteDialog } from "./QuestionDeleteDialog";
import { TypeSpecificAnswerEditor } from "./TypeSpecificAnswerEditor";
import { createQuestionSaver } from "./question-save";
import { useQuestionCardMutations } from "./use-question-card-mutations";
import { useQuestionDraft } from "./use-question-draft";

/**
 * One editable question. Holds its own draft so typing doesn't re-render
 * sibling cards, and reports unsaved state up via onDirtyChange.
 *
 * Extracted from the former 3.5k-line quiz-manage.tsx; behaviour unchanged.
 * The card is now pure composition — draft state and derived flags live in
 * useQuestionDraft, the mutations in useQuestionCardMutations, and each visual
 * block in its own QuestionCard* component.
 */
export function QuestionCard({
  quizId,
  courseId,
  question,
  outcomes,
  selected,
  onToggleSelect,
  onQueueDelete,
  published = false,
  onDirtyChange,
  onUserEditChange,
}: {
  quizId: string;
  courseId: string;
  question: QuizQuestionAuthoring;
  outcomes: CourseLearningOutcomeAuthoring[];
  selected: boolean;
  onToggleSelect: () => void;
  onQueueDelete: (item: PendingQuestionDelete) => void;
  /** Published quizzes are frozen — the mutating actions (Save / Approve /
   *  Regenerate / Delete) are hidden entirely rather than shown disabled,
   *  since the backend hard-rejects every edit with 409. */
  published?: boolean;
  /** Reports unsaved-edit state up to the navigator. */
  onDirtyChange?: (questionId: string, dirty: boolean) => void;
  /** Explicit teacher edits only — feeds the leave-guard. */
  onUserEditChange?: (questionId: string, edited: boolean) => void;
}) {
  const { t } = useTranslation();
  const {
    updateQuestion,
    regenerate,
    duplicate,
    addToBank,
    handleAddToBank,
    handleDuplicate,
    handleRegenerate,
  } = useQuestionCardMutations(courseId, quizId, question.id, t);
  const [confirmAddToBank, setConfirmAddToBank] = useState(false);
  const {
    draft,
    setDraft,
    confirmDelete,
    setConfirmDelete,
    hasOptions,
    allowMultiCorrect,
    blankCount,
    expectedSeconds,
    draftTimeInvalid,
  } = useQuestionDraft(question, onDirtyChange, onUserEditChange);

  const handleSave = createQuestionSaver({
    draft,
    question,
    hasOptions,
    allowMultiCorrect,
    t,
    patchQuestion: updateQuestion.mutateAsync,
  });

  function handleDelete() {
    // Deferred: stage the delete (optimistically hidden by the parent) and
    // start/refresh the 5s combo timer. The Undo banner can revert it; the
    // real DELETE only fires when the combo commits. No confirm step needed
    // — undo IS the safety net.
    const prompt = (question.prompt_text ?? "").trim();
    onQueueDelete({
      id: question.id,
      label: prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt,
    });
  }

  return (
    <div
      id={`qcard-${question.id}`}
      // scroll-margin keeps the card clear of the sticky header when the
      // question navigator scrolls it into view.
      className={cn(
        "rounded-xl border-2 bg-m3-surface p-4 space-y-3 scroll-mt-[9.5rem]",
        selected
          ? "border-m3-primary shadow-sm"
          : "border-m3-outline-variant/50",
      )}
    >
      <QuestionCardMetaRow
        question={question}
        selected={selected}
        onToggleSelect={onToggleSelect}
        expectedSeconds={expectedSeconds}
      />

      <QuestionCardBody draft={draft} setDraft={setDraft} outcomes={outcomes} />

      {hasOptions && (
        <QuestionCardOptionsEditor
          question={question}
          draft={draft}
          setDraft={setDraft}
          allowMultiCorrect={allowMultiCorrect}
        />
      )}

      <QuestionCardCorrectAnswer
        question={question}
        value={draft.correct_answer}
        blankCount={blankCount}
        onChange={(next) =>
          setDraft((current) => ({ ...current, correct_answer: next }))
        }
      />

      {question.question_type === "fill_blank" && (
        <QuestionCardFillBlankDistractors
          distractors={draft.fill_blank_distractors}
          onChange={(next) =>
            setDraft((current) => ({
              ...current,
              fill_blank_distractors: next,
            }))
          }
        />
      )}

      <TypeSpecificAnswerEditor
        questionType={question.question_type}
        value={{
          single_answer: draft.single_answer,
          numeric_answer: draft.numeric_answer,
          numeric_tolerance: draft.numeric_tolerance,
          match_pairs: draft.match_pairs,
          match_distractors: draft.match_distractors,
          ordering_sequence: draft.ordering_sequence,
          correct_answer: draft.correct_answer,
        }}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
      />

      <QuestionCardConfig
        question={question}
        draft={draft}
        setDraft={setDraft}
        draftTimeInvalid={draftTimeInvalid}
      />

      {/* Published quiz = frozen. Hide the mutating actions entirely (Save /
          Approve / Regenerate / Delete) rather than showing them disabled —
          the backend rejects every edit with 409, so a greyed-out row would
          only invite dead clicks. The card stays visible read-only. */}
      {!published && (
        <QuestionCardActions
          question={question}
          savePending={updateQuestion.isPending}
          regeneratePending={regenerate.isPending}
          duplicatePending={duplicate.isPending}
          addToBankPending={addToBank.isPending}
          onSave={handleSave}
          onRegenerate={handleRegenerate}
          onDuplicate={handleDuplicate}
          onRequestAddToBank={() => setConfirmAddToBank(true)}
          onRequestDelete={() => setConfirmDelete(true)}
        />
      )}

      {confirmDelete && (
        <QuestionDeleteDialog
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            handleDelete();
          }}
        />
      )}

      <ConfirmDialog
        open={confirmAddToBank}
        onOpenChange={setConfirmAddToBank}
        title="Add question to curated bank?"
        description="A reusable snapshot will be created for this course. Future edits to this Quiz question will not update the bank copy."
        confirmLabel="Add to bank"
        confirmVariant="default"
        isPending={addToBank.isPending}
        onConfirm={() => {
          void handleAddToBank().then(() => setConfirmAddToBank(false));
        }}
      />
    </div>
  );
}
