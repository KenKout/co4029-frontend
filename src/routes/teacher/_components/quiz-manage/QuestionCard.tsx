import { useTranslation } from "react-i18next";

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
  question,
  outcomes,
  selected,
  onToggleSelect,
  onQueueDelete,
  published = false,
  onDirtyChange,
}: {
  quizId: string;
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
}) {
  const { t } = useTranslation();
  const {
    updateQuestion,
    regenerate,
    duplicate,
    handleDuplicate,
    handleRegenerate,
  } = useQuestionCardMutations(quizId, question.id, t);
  const {
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
  } = useQuestionDraft(question, onDirtyChange);

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
        "rounded-xl border bg-m3-surface p-4 space-y-3 scroll-mt-[9.5rem]",
        selected
          ? "border-m3-primary shadow-sm"
          : "border-m3-outline-variant/20",
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
        correctAnswer={correctAnswer}
        blankCount={blankCount}
      />

      <TypeSpecificAnswerEditor
        questionType={question.question_type}
        value={{
          single_answer: draft.single_answer,
          numeric_answer: draft.numeric_answer,
          numeric_tolerance: draft.numeric_tolerance,
          match_pairs: draft.match_pairs,
          ordering_sequence: draft.ordering_sequence,
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
          onSave={handleSave}
          onRegenerate={handleRegenerate}
          onDuplicate={handleDuplicate}
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
    </div>
  );
}
