import type { InterviewOutcomeAuthoring } from "@/lib/api/types";
import { BulkActionBar } from "./BulkActionBar";
import { ImportFromBankPanel } from "./ImportFromBankPanel";
import { QuestionBankHeader } from "./QuestionBankHeader";
import { QuestionFiltersPanel } from "./QuestionFiltersPanel";
import type {
  BulkActionsController,
  ExpandedRowsController,
  QuestionBankIoController,
  QuestionMutationsController,
  QuestionSelectionController,
} from "./question-card-renderer";
import type { QuestionDerived } from "./use-question-derived";
import type { QuestionEditorController } from "./use-question-editor";
import type { QuestionFiltersController } from "./use-question-filters";
import type { useCompactMode } from "./use-question-view-state";

export interface QuestionBankToolbarProps {
  isPublished: boolean;
  moduleTitle?: string | null;
  outcomes: InterviewOutcomeAuthoring[];
  derived: QuestionDerived;
  filters: QuestionFiltersController;
  hasQuestions: boolean;
  view: ReturnType<typeof useCompactMode>;
  rows: ExpandedRowsController;
  mutations: QuestionMutationsController;
  editor: QuestionEditorController;
  bankIo: QuestionBankIoController;
  selection: QuestionSelectionController;
  bulk: BulkActionsController;
  updatePending: boolean;
  bankItemCount: number;
}

export function QuestionBankToolbar(props: QuestionBankToolbarProps) {
  const { derived, filters, view, rows, mutations, editor, bankIo, bulk } =
    props;
  const { selection } = props;
  return (
    <div className="sticky top-32 z-[5] rounded-t-xl border-b border-m3-outline-variant/20 bg-m3-surface-container-lowest/95 backdrop-blur-sm px-4 lg:px-6 py-3 space-y-3">
      <QuestionBankHeader
        isPublished={props.isPublished}
        moduleTitle={props.moduleTitle}
        anyFilterActive={filters.anyFilterActive}
        filteredCount={filters.filtered.length}
        totalCount={derived.sorted.length}
        approvedCount={derived.approvedCount}
        hasQuestions={props.hasQuestions}
        compact={view.compact}
        onToggleCompact={view.toggleCompact}
        expandedCount={rows.expanded.size}
        onCollapseAll={rows.collapseAll}
        pendingCount={derived.pendingQuestions.length}
        approvingAll={mutations.approvingAll}
        updatePending={props.updatePending}
        onApproveAll={() => void mutations.handleApproveAll()}
        adding={editor.adding}
        importing={bankIo.importing}
        bankItemCount={props.bankItemCount}
        onStartImport={bankIo.startImport}
        onStartAdd={() => editor.setAdding(true)}
      />

      {!props.isPublished && bankIo.importing && (
        <ImportFromBankPanel
          units={bankIo.importPickerUnits}
          selected={bankIo.selectedBank}
          onToggle={bankIo.toggleBankSelection}
          busy={bankIo.importBusy}
          onCancel={() => bankIo.setImporting(false)}
          onConfirm={() => void bankIo.handleImportFromBank()}
        />
      )}

      {props.hasQuestions && (
        <QuestionFiltersPanel
          filters={filters.filters}
          onSearchChange={filters.setSearch}
          onStatusFilterChange={filters.setStatusFilter}
          onOutcomeFilterChange={filters.setOutcomeFilter}
          onDifficultyFilterChange={filters.setDifficultyFilter}
          onTypeFilterChange={filters.setTypeFilter}
          onSourceFilterChange={filters.setSourceFilter}
          outcomes={props.outcomes}
          outcomeById={derived.outcomeById}
          presentDifficulties={derived.presentDifficulties}
          presentTypes={derived.presentTypes}
          statusCounts={derived.statusCounts}
          totalCount={derived.sorted.length}
          anyFilterActive={filters.anyFilterActive}
          onClearFilters={filters.clearFilters}
        />
      )}

      {!props.isPublished && selection.selectedQuestions.length > 0 && (
        <BulkActionBar
          count={selection.selectedQuestions.length}
          busy={bulk.bulkBusy}
          outcomeOptions={derived.outcomeOptions}
          onSetStatus={(status) => void bulk.bulkSetStatus(status)}
          onSetOutcome={(outcomeId) => void bulk.bulkSetOutcome(outcomeId)}
          onAddToBank={() => void bulk.bulkAddToBank()}
          onDelete={() => void bulk.bulkDelete()}
          onClear={selection.clearSelection}
        />
      )}
    </div>
  );
}
