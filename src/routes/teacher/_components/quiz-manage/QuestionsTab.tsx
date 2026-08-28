import { useTranslation } from "react-i18next";

import type { PendingQuestionDelete } from "@/lib/api/hooks/quizzes";
import type {
  CourseLearningOutcomeAuthoring,
  QuizQuestionAuthoring,
} from "@/lib/api/types";
import { BulkSetExpectedTimeBar } from "./BulkSetExpectedTimeBar";
import { QuestionsBulkDeleteDialog } from "./QuestionsBulkDeleteDialog";
import { QuestionsTabAddControls } from "./QuestionsTabAddControls";
import { QuestionsTabBanners } from "./QuestionsTabBanners";
import { QuestionsTabList } from "./QuestionsTabList";
import { QuestionsTabSidebar } from "./QuestionsTabSidebar";
import { summariseQuestionCounts } from "./question-counts";
import { useQuestionsBulkActions } from "./use-questions-bulk-actions";
import { useQuestionsTabState } from "./use-questions-tab-state";

/**
 * Questions tab: bulk-action bar, the question list, add-question controls,
 * and the AI/import side panel. Owns per-question unsaved state so the
 * navigator can render a Saved/Unsaved layer.
 *
 * Extracted from the former 3.5k-line quiz-manage.tsx; behaviour unchanged.
 * The tab is now composition plus the expected-time bookkeeping the banners
 * read; state lives in useQuestionsTabState and the bulk mutations in
 * useQuestionsBulkActions.
 */
export function QuestionsTab({
  quizId,
  questions,
  outcomes,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  bulkSeconds,
  onBulkSecondsChange,
  onAddQuestion,
  addPending,
  onOpenGenerator,
  onOpenBank,
  onOpenImportExport,
  onQueueDelete,
  published = false,
  onDirtyCountChange,
}: {
  quizId: string;
  questions: QuizQuestionAuthoring[];
  outcomes: CourseLearningOutcomeAuthoring[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  bulkSeconds: string;
  onBulkSecondsChange: (value: string) => void;
  onAddQuestion: (questionType?: string) => void | Promise<void>;
  addPending: boolean;
  onOpenGenerator: () => void;
  onOpenBank: () => void;
  onOpenImportExport: () => void;
  onQueueDelete: (item: PendingQuestionDelete) => void;
  /** Published quiz: hide all authoring controls (bulk bar, add-question,
   *  per-card actions) instead of disabling them. */
  published?: boolean;
  /** How many question cards currently hold unsaved edits. The parent uses
   *  this to guard tab switches, which unmount this whole subtree. */
  onDirtyCountChange?: (count: number) => void;
}) {
  const { t } = useTranslation();
  const {
    bulkSet,
    bulkApprove,
    bulkValid,
    handleSaveDefaultTimes,
    handleApplyBulk,
    handleApproveBulk,
  } = useQuestionsBulkActions({
    quizId,
    t,
    selectedIds,
    bulkSeconds,
    onClearSelection,
  });
  const {
    dirtyIds,
    confirmBulkDelete,
    setConfirmBulkDelete,
    handleDirtyChange,
    handleUserEditChange,
  } = useQuestionsTabState(onDirtyCountChange);

  const {
    pendingCount,
    unsavedDefaultTimeIds,
    unsavedDefaultTimeCount,
    blankExpectedTimeCount,
  } = summariseQuestionCounts(questions, dirtyIds);

  /** Stage every selected question for deletion in one go.
   *
   * Reuses the per-question combo-undo path (``onQueueDelete``) rather than
   * adding a bulk endpoint: each id is staged, the shared 5s countdown covers
   * the whole batch, and the undo snackbar can cancel all of them at once
   * because nothing has been sent to the server yet. Selection is cleared so
   * the bar doesn't keep acting on rows that are already hidden.
   *
   * Gated behind a confirm dialog: unlike a single-card delete, this can wipe
   * the whole quiz in one click, so the 5s undo window alone is too thin a
   * safety net — the teacher should see the count before it happens.
   */
  function handleDeleteSelectedConfirmed() {
    const targets = questions.filter((q) => selectedIds.has(q.id));
    setConfirmBulkDelete(null);
    if (targets.length === 0) return;
    for (const question of targets) {
      onQueueDelete({
        id: question.id,
        label: question.prompt_text?.slice(0, 60) || question.id,
      });
    }
    onClearSelection();
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <QuestionsBulkDeleteDialog
        count={confirmBulkDelete}
        onOpenChange={(next) =>
          setConfirmBulkDelete(next ? selectedIds.size : null)
        }
        onConfirm={handleDeleteSelectedConfirmed}
      />
      <div className="col-span-12 lg:col-span-8 space-y-4 min-w-0">
        {/* The combo-undo snackbar now lives at page level (see
            QuizManagePage) so it stays visible when a delete is queued from
            the Preview tab too. */}
        <QuestionsTabBanners
          totalQuestions={questions.length}
          unsavedDefaultTimeCount={unsavedDefaultTimeCount}
          blankExpectedTimeCount={blankExpectedTimeCount}
          pendingCount={pendingCount}
          savingDefaults={bulkSet.isPending}
          onSaveDefaultTimes={() =>
            handleSaveDefaultTimes(unsavedDefaultTimeIds)
          }
        />

        {/* Bulk set-time / approve is authoring only — a published quiz is
            frozen, so hide the whole bar rather than leave dead controls. */}
        {!published && (
          <BulkSetExpectedTimeBar
            totalQuestions={questions.length}
            selectedCount={selectedIds.size}
            bulkSeconds={bulkSeconds}
            onBulkSecondsChange={onBulkSecondsChange}
            onSelectAll={onSelectAll}
            onClear={onClearSelection}
            onApply={handleApplyBulk}
            applyValid={bulkValid}
            applying={bulkSet.isPending}
            onApprove={handleApproveBulk}
            approveValid={selectedIds.size > 0}
            approving={bulkApprove.isPending}
            onDeleteSelected={() => setConfirmBulkDelete(selectedIds.size)}
          />
        )}

        <QuestionsTabList
          quizId={quizId}
          questions={questions}
          outcomes={outcomes}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onQueueDelete={onQueueDelete}
          published={published}
          onDirtyChange={handleDirtyChange}
          onUserEditChange={handleUserEditChange}
        />

        {/* Add-question controls are authoring only — hidden on a published
            (frozen) quiz so no new questions can be seeded. */}
        {!published && (
          <QuestionsTabAddControls
            onAddQuestion={onAddQuestion}
            onOpenGenerator={onOpenGenerator}
            addPending={addPending}
          />
        )}
      </div>

      <QuestionsTabSidebar
        questions={questions}
        selectedIds={selectedIds}
        dirtyIds={dirtyIds}
        published={published}
        onOpenGenerator={onOpenGenerator}
        onOpenBank={onOpenBank}
        onOpenImportExport={onOpenImportExport}
      />
    </div>
  );
}
