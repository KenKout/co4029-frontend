import { useEffect, useState } from "react";
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
import { QuestionCardExplanation } from "./QuestionCardExplanation";
import { QuestionCardMetaRail } from "./QuestionCardMetaRail";
import { QuestionCardCorrectAnswer } from "./QuestionCardCorrectAnswer";
import { QuestionCardFillBlankDistractors } from "./QuestionCardFillBlankDistractors";
import { QuestionCardMetaRow } from "./QuestionCardMetaRow";
import { QuestionCardOptionsEditor } from "./QuestionCardOptionsEditor";
import { QuestionDeleteDialog } from "./QuestionDeleteDialog";
import { TypeSpecificAnswerEditor } from "./TypeSpecificAnswerEditor";
import { createQuestionSaver } from "./question-save";
import type { QuestionSaver } from "./question-save";
import { useQuestionCardMutations } from "./use-question-card-mutations";
import { useQuestionDraft } from "./use-question-draft";

/**
 * One editable question. Holds its own draft so typing doesn't re-render
 * sibling cards, and reports unsaved state up via onDirtyChange.
 *
 * Extracted from the former 3.5k-line quiz-manage.tsx. The card is pure
 * composition — draft state and derived flags live in useQuestionDraft, the
 * mutations in useQuestionCardMutations, and each visual block in its own
 * QuestionCard* component.
 *
 * LAYOUT. The card is two columns: the question and its answers on the left,
 * the settings that describe it in a rail on the right. It used to be one
 * column of nine stacked blocks, which measured 907px per card on a real
 * five-question quiz — 5171px of scroll — and was exactly 907px whether the
 * question was 63 characters or 136, because three of the fields had fixed
 * `rows`. Of that height, 280px (31%) was hint + outcome + configuration:
 * settings sitting between the teacher and the options, with the hint given
 * the same vertical weight as the question itself.
 *
 * The rail is shorter than the content column, so the height it occupies was
 * already being paid for. Measured on the same quiz afterwards: cards run
 * 571-616px and now VARY with their content, and the page is 3605px instead
 * of 5171px. Not the ~430px a first sketch suggested — the narrower content
 * column wraps a long stem onto three lines where the full-width field fitted
 * it on one, which is the cost of bringing the measure down from 103
 * characters to about 50.
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
  onRegisterSaver,
  resetToken = 0,
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
  /**
   * Hand this card's save function up so the quiz-level save bar can run it.
   *
   * The draft deliberately stays local (lifting it would re-render every
   * sibling on each keystroke), so "Save all" cannot build the payload
   * itself — it calls back into each card instead. Re-registered on every
   * render because the saver closes over the current draft; passing `null`
   * on unmount keeps a deleted question out of the next batch.
   */
  onRegisterSaver?: (questionId: string, save: QuestionSaver | null) => void;
  /** Incremented by "Discard" to reset every draft back to the stored row. */
  resetToken?: number;
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
    isUnsaved,
  } = useQuestionDraft(question, onDirtyChange, onUserEditChange, resetToken);

  const handleSave = createQuestionSaver({
    draft,
    question,
    hasOptions,
    allowMultiCorrect,
    t,
    patchQuestion: updateQuestion.mutateAsync,
  });

  // No dependency array: `handleSave` closes over the draft, so a stale
  // registration would save the text as it stood on the last keystroke that
  // happened to change the deps.
  useEffect(() => {
    onRegisterSaver?.(question.id, handleSave);
  });
  useEffect(() => {
    return () => onRegisterSaver?.(question.id, null);
  }, [question.id, onRegisterSaver]);

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
        dirty={isUnsaved}
        actions={
          /* Published quiz = frozen. Hide the mutating actions entirely
             (Approve / Regenerate / Duplicate / Delete) rather than showing
             them disabled — the backend rejects every edit with 409, so a
             greyed-out control would only invite dead clicks. The card stays
             visible read-only. */
          published ? undefined : (
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
          )
        }
      />

      {/* Content left, settings right. The rail drops under the content on
          narrow viewports rather than squeezing both — a 40% rail on a phone
          is narrower than its own labels. */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <QuestionCardBody draft={draft} setDraft={setDraft} />

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

          {/* Stays in the content column: for matching and ordering questions
              this IS the answer editor (pair lists, sequences), not a setting.
              For multiple_choice it is the radio/checkbox switch, which reads
              correctly directly under the options it governs. */}
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
            onChange={(patch) =>
              setDraft((current) => ({ ...current, ...patch }))
            }
          />

          <QuestionCardExplanation draft={draft} setDraft={setDraft} />
        </div>

        <QuestionCardMetaRail
          question={question}
          draft={draft}
          setDraft={setDraft}
          outcomes={outcomes}
          draftTimeInvalid={draftTimeInvalid}
        />
      </div>

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
