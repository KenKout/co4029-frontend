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

/**
 * The Question Bank's sticky toolbar: header row, the import-from-bank picker,
 * the search + filters card, and the bulk-action bar.
 *
 * Extracted verbatim from the former 2.4k-line question-bank.tsx — same
 * element structure, same classNames, same conditional-render order.
 *
 * Props arrive as whole controllers rather than ~40 flattened values, matching
 * how `QuestionListSection` is wired: each cluster already has one owning hook,
 * so re-listing its fields at the boundary would only add drift risk.
 */
export interface QuestionBankToolbarProps {
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
    /* Sticky toolbar: title + count + search + collapse-all + add. Sits
       below the section-nav (top-16 bar + ~52px nav ≈ top-32). */
    <div className="sticky top-32 z-[5] rounded-t-xl border-b border-m3-outline-variant/20 bg-m3-surface-container-lowest/95 backdrop-blur-sm px-4 lg:px-6 py-3 space-y-3">
      <QuestionBankHeader
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

      {/* Import-from-bank picker: multi-select course bank questions to copy
          in. Already-present questions (by prompt) are filtered out. */}
      {bankIo.importing && (
        <ImportFromBankPanel
          items={bankIo.importableBankItems}
          selected={bankIo.selectedBank}
          onToggle={bankIo.toggleBankSelection}
          busy={bankIo.importBusy}
          onCancel={() => bankIo.setImporting(false)}
          onConfirm={() => void bankIo.handleImportFromBank()}
        />
      )}

      {/* Search + filters — only when there are questions to filter. */}
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

      {/* The bulk-action bar lives INSIDE the sticky toolbar rather than
          sticking on its own. It used to pin at the same `top-32` as the
          toolbar with a higher z-index, so the moment you scrolled with a
          selection active it landed on top of the search field and filter
          row and hid them. Its correct offset would have been "toolbar
          height + top-32", but the toolbar's height varies with the filter
          and chip rows, so sharing one stacking box is the fix rather than
          another hand-tuned magic number. */}
      {selection.selectedQuestions.length > 0 && (
        <BulkActionBar
          count={selection.selectedQuestions.length}
          busy={bulk.bulkBusy}
          outcomeOptions={derived.outcomeOptions}
          onSetStatus={(s) => void bulk.bulkSetStatus(s)}
          onSetOutcome={(o) => void bulk.bulkSetOutcome(o)}
          onAddToBank={() => void bulk.bulkAddToBank()}
          onDelete={() => void bulk.bulkDelete()}
          onClear={selection.clearSelection}
        />
      )}
    </div>
  );
}
