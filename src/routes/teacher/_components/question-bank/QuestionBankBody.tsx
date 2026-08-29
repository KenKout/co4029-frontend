import { AddQuestionForm } from "./AddQuestionForm";
import { EmptyBankState, EmptyFilteredState } from "./EmptyStates";
import { QuestionListSection } from "./QuestionListSection";
import type {
  ExpandedRowsController,
  QuestionBankIoController,
  QuestionMutationsController,
  QuestionReorderController,
  QuestionSelectionController,
} from "./question-card-renderer";
import type { useModuleGroups } from "./use-module-groups";
import type { QuestionDerived } from "./use-question-derived";
import type { QuestionEditorController } from "./use-question-editor";
import type { QuestionFiltersController } from "./use-question-filters";
import type { useCompactMode } from "./use-question-view-state";

/**
 * The Question Bank's scrolling content region: the add-manual form, the two
 * empty states, and the question list.
 *
 * Extracted verbatim from the former 2.4k-line question-bank.tsx — same
 * element structure, same classNames, same nested-ternary render order, so the
 * empty-vs-filtered-empty-vs-list decision is unchanged.
 */
export interface QuestionBankBodyProps {
  derived: QuestionDerived;
  filters: QuestionFiltersController;
  groups: ReturnType<typeof useModuleGroups>;
  hasQuestions: boolean;
  /** Combined create + duplicate-check in-flight state for the add form. */
  addPending: boolean;
  view: ReturnType<typeof useCompactMode>;
  rows: ExpandedRowsController;
  mutations: QuestionMutationsController;
  editor: QuestionEditorController;
  bankIo: QuestionBankIoController;
  reorder: QuestionReorderController;
  selection: QuestionSelectionController;
  isPublished: boolean;
}

export function QuestionBankBody(props: QuestionBankBodyProps) {
  const { derived, filters, groups, editor } = props;
  return (
    <div className="p-4 lg:p-6 space-y-3">
      {/* Add-manual inline form */}
      {editor.adding && (
        <AddQuestionForm
          newText={editor.newText}
          newAnswer={editor.newAnswer}
          pending={props.addPending}
          onChangeText={editor.setNewText}
          onChangeAnswer={editor.setNewAnswer}
          onCancel={editor.cancelAdd}
          onSubmit={() => void editor.handleAdd()}
        />
      )}

      {/* Empty states — two distinct weights. */}
      {!props.hasQuestions ? (
        <EmptyBankState
          adding={editor.adding}
          onStartAdd={() => editor.setAdding(true)}
        />
      ) : filters.filtered.length === 0 ? (
        <EmptyFilteredState onClearFilters={filters.clearFilters} />
      ) : (
        <QuestionListSection
          sorted={derived.sorted}
          filtered={filters.filtered}
          groupedByModule={groups.groupedByModule}
          showModuleGroups={groups.showModuleGroups}
          anyFilterActive={filters.anyFilterActive}
          compact={props.view.compact}
          outcomeOptions={derived.outcomeOptions}
          moduleTitleById={groups.moduleTitleById}
          rows={props.rows}
          mutations={props.mutations}
          edit={editor.edit}
          bankIo={props.bankIo}
          reorder={props.reorder}
          selection={props.selection}
          isPublished={props.isPublished}
        />
      )}
    </div>
  );
}
