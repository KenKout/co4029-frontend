import { useTranslation } from "react-i18next";

import { useConfirm } from "@/components/ui/use-confirm";
import {
  useAddToInterviewQuestionBank,
  useCheckInterviewQuestionDuplicate,
  useCreateInterviewQuestion,
  useDeleteInterviewQuestion,
  useInterviewQuestionBank,
  useUpdateInterviewQuestion,
} from "@/lib/api/hooks/interviews";
import type {
  InterviewOutcomeAuthoring,
  InterviewQuestionAuthoring,
} from "@/lib/api/types";
import { DuplicateWarningDialog } from "./question-bank/DuplicateWarningDialog";
import { QuestionBankBody } from "./question-bank/QuestionBankBody";
import { QuestionBankToolbar } from "./question-bank/QuestionBankToolbar";
import { useBulkActions } from "./question-bank/use-bulk-actions";
import { useModuleGroups } from "./question-bank/use-module-groups";
import { useQuestionBankIo } from "./question-bank/use-question-bank-io";
import { useQuestionDerived } from "./question-bank/use-question-derived";
import { useQuestionEditor } from "./question-bank/use-question-editor";
import { useQuestionFilters } from "./question-bank/use-question-filters";
import { useQuestionMutations } from "./question-bank/use-question-mutations";
import { useQuestionReorder } from "./question-bank/use-question-reorder";
import { useQuestionSelection } from "./question-bank/use-question-selection";
import {
  useCompactMode,
  useExpandedRows,
  useLiveRegion,
} from "./question-bank/use-question-view-state";

/**
 * The Question Bank is a review workspace over the REAL question data. Every
 * feature here reads/writes existing fields only — no fabricated metadata,
 * no backend schema changes. The unified status control maps the existing
 * `review_status` enum (pending | approved | edited | rejected) onto the
 * four teacher-facing labels (Needs review | Approved | Draft | Has issues);
 * changing status just PATCHes `review_status`, preserving the approval logic.
 *
 * This module is the orchestrator: state wiring, data access and composition.
 * The presentational regions, the pure helpers and the stateful clusters live
 * in `./question-bank/*`.
 */
interface QuestionBankProps {
  configId: string;
  /** Parent course id — enables the course-scoped shared question bank. */
  courseId: string;
  /** Title of the module this interview belongs to (shown as a badge). */
  moduleTitle?: string | null;
  /** Course modules (id + title) for grouping questions by source module. */
  modules?: { id: string; title: string }[];
  questions: InterviewQuestionAuthoring[];
  outcomes: InterviewOutcomeAuthoring[];
  /**
   * External request to filter by a specific outcome (from the Learning
   * Outcomes "View questions" action). The `nonce` lets the same outcome be
   * re-requested; the effect re-runs whenever it changes.
   */
  outcomeFilterSignal?: { id: string | "none"; nonce: number } | null;
}

export function QuestionBank({
  configId,
  courseId,
  moduleTitle,
  modules = [],
  questions,
  outcomes,
  outcomeFilterSignal,
}: QuestionBankProps) {
  const { t } = useTranslation();
  const updateQuestion = useUpdateInterviewQuestion(configId);
  const deleteQuestion = useDeleteInterviewQuestion(configId);
  const createQuestion = useCreateInterviewQuestion(configId);
  const checkDuplicate = useCheckInterviewQuestionDuplicate(configId);
  const addToBank = useAddToInterviewQuestionBank(courseId);
  const { data: bankItems } = useInterviewQuestionBank(courseId);
  const { confirm: confirmAction, dialog: confirmActionDialog } = useConfirm({
    title: t("teacher_interview_config.qbank.confirm_title", {
      defaultValue: "Confirm",
    }),
    confirmLabel: t("common.confirm"),
    cancelLabel: t("common.cancel"),
  });

  const derived = useQuestionDerived({ questions, outcomes });
  const { sorted, outcomeById } = derived;

  // ── Local UI state (no server state) ──────────────────────────────────────
  const { liveRegionRef, announce } = useLiveRegion();
  const rows = useExpandedRows();
  const view = useCompactMode();

  const mutations = useQuestionMutations({
    updateQuestion,
    deleteQuestion,
    pendingQuestions: derived.pendingQuestions,
    outcomeById,
    announce,
    t,
  });
  const editor = useQuestionEditor({
    updateQuestion,
    createQuestion,
    checkDuplicate,
    confirmAction,
    setExpanded: rows.setExpanded,
    setSavingId: mutations.setSavingId,
    t,
  });
  const bankIo = useQuestionBankIo({
    configId,
    sorted,
    bankItems,
    addToBank,
    createQuestion,
    announce,
    t,
  });
  const filters = useQuestionFilters({
    sorted,
    outcomeById,
    outcomeFilterSignal,
  });
  const groups = useModuleGroups({ filtered: filters.filtered, modules, t });

  const selection = useQuestionSelection({
    sorted,
    filtered: filters.filtered,
    deletingIds: mutations.deletingIds,
  });
  const bulk = useBulkActions({
    configId,
    selectedQuestions: selection.selectedQuestions,
    clearSelection: selection.clearSelection,
    updateQuestion,
    deleteQuestion,
    addToBank,
    bankedPrompts: bankIo.bankedPrompts,
    setDeletingIds: mutations.setDeletingIds,
    confirmAction,
    t,
  });
  const reorder = useQuestionReorder({
    sorted,
    updateQuestion,
    announce,
    t,
  });

  const hasQuestions = sorted.length > 0;

  return (
    <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/60 rounded-xl shadow-glass">
      <QuestionBankToolbar
        moduleTitle={moduleTitle}
        outcomes={outcomes}
        derived={derived}
        filters={filters}
        hasQuestions={hasQuestions}
        view={view}
        rows={rows}
        mutations={mutations}
        editor={editor}
        bankIo={bankIo}
        selection={selection}
        bulk={bulk}
        updatePending={updateQuestion.isPending}
        bankItemCount={bankItems?.length ?? 0}
      />

      <QuestionBankBody
        derived={derived}
        filters={filters}
        groups={groups}
        hasQuestions={hasQuestions}
        addPending={createQuestion.isPending || checkDuplicate.isPending}
        view={view}
        rows={rows}
        mutations={mutations}
        editor={editor}
        bankIo={bankIo}
        reorder={reorder}
        selection={selection}
      />

      {/* Screen-reader live region for status/reorder announcements */}
      <div ref={liveRegionRef} aria-live="polite" className="sr-only" />

      {confirmActionDialog}

      <DuplicateWarningDialog
        warning={editor.duplicateWarning}
        onDismiss={editor.dismissDuplicateWarning}
        onConfirm={editor.confirmDuplicateWarning}
      />
    </div>
  );
}

export default QuestionBank;
