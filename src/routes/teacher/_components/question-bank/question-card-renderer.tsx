import type { ReactNode } from "react";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import { QuestionCard } from "./QuestionCard";
import type { OutcomeOption, TranslateFn } from "./types";
import type { useBulkActions } from "./use-bulk-actions";
import type { useQuestionBankIo } from "./use-question-bank-io";
import type { useQuestionEditDraft } from "./use-question-edit-draft";
import type { useQuestionMutations } from "./use-question-mutations";
import type { useQuestionReorder } from "./use-question-reorder";
import type { useQuestionSelection } from "./use-question-selection";
import type { useExpandedRows } from "./use-question-view-state";

export type ExpandedRowsController = ReturnType<typeof useExpandedRows>;
export type QuestionMutationsController = ReturnType<
  typeof useQuestionMutations
>;
export type EditDraftController = ReturnType<typeof useQuestionEditDraft>;
export type QuestionBankIoController = ReturnType<typeof useQuestionBankIo>;
export type QuestionReorderController = ReturnType<typeof useQuestionReorder>;
export type QuestionSelectionController = ReturnType<
  typeof useQuestionSelection
>;
export type BulkActionsController = ReturnType<typeof useBulkActions>;

/** Everything one question row needs, bundled by owning concern. */
export interface QuestionCardRendererDeps {
  sorted: InterviewQuestionAuthoring[];
  compact: boolean;
  outcomeOptions: OutcomeOption[];
  moduleTitleById: Map<string, string>;
  dndEnabled: boolean;
  t: TranslateFn;
  rows: ExpandedRowsController;
  mutations: QuestionMutationsController;
  edit: EditDraftController;
  bankIo: QuestionBankIoController;
  reorder: QuestionReorderController;
  selection: QuestionSelectionController;
}

/**
 * Build the per-question renderer. Extracted verbatim from the render closure
 * inside the former 2.4k-line question-bank.tsx — same props, same `void`
 * fire-and-forget wrappers, same `displayIndex` lookup against the
 * position-sorted list, so the rendered element tree is unchanged.
 */
export function createQuestionCardRenderer(
  deps: QuestionCardRendererDeps,
): (q: InterviewQuestionAuthoring) => ReactNode {
  const {
    sorted,
    compact,
    outcomeOptions,
    moduleTitleById,
    dndEnabled,
    t,
    rows,
    mutations,
    edit,
    bankIo,
    reorder,
    selection,
  } = deps;
  return (q: InterviewQuestionAuthoring) => {
    const displayIndex = sorted.findIndex((s) => s.id === q.id);
    return (
      <QuestionCard
        key={q.id}
        q={q}
        index={displayIndex}
        total={sorted.length}
        expanded={rows.expanded.has(q.id)}
        editing={edit.editingId === q.id}
        editingText={edit.editingText}
        editingAnswer={edit.editingAnswer}
        outcomeOptions={outcomeOptions}
        deleting={mutations.deletingIds.has(q.id)}
        saving={mutations.savingId === q.id}
        reordering={reorder.reordering}
        onToggleExpand={() => rows.toggleExpanded(q.id)}
        onSetStatus={(s) => void mutations.setStatus(q, s)}
        onSetOutcome={(o) => void mutations.setOutcome(q, o)}
        onBeginEdit={() => edit.beginEdit(q)}
        onCancelEdit={() => void edit.cancelEdit()}
        onSaveEdit={() => void edit.saveEdit()}
        onChangeEditingText={(v) => edit.changeEditingText(v)}
        onChangeEditingAnswer={(v) => edit.changeEditingAnswer(v)}
        onDelete={() => void mutations.handleDelete(q)}
        onMoveToTop={() => void reorder.handleMoveTo(displayIndex, 0)}
        onMoveToBottom={() =>
          void reorder.handleMoveTo(displayIndex, sorted.length - 1)
        }
        onAddToBank={() => void bankIo.handleAddToBank(q)}
        banking={bankIo.bankingId === q.id}
        alreadyInBank={bankIo.bankedPrompts.has(
          q.prompt_text.trim().toLowerCase(),
        )}
        selected={selection.selectedIds.has(q.id)}
        onToggleSelect={() => selection.toggleSelected(q.id)}
        compact={compact}
        moduleTitles={(Array.isArray(q.source_module_ids)
          ? q.source_module_ids
          : []
        ).map(
          (id) =>
            moduleTitleById.get(id) ??
            t("teacher_interview_config.qbank.module_unknown"),
        )}
        dndEnabled={dndEnabled}
        dragging={reorder.dragIndex === displayIndex}
        showLineBefore={
          reorder.dragOverIndex === displayIndex && reorder.dropBefore
        }
        showLineAfter={
          reorder.dragOverIndex === displayIndex && !reorder.dropBefore
        }
        onDragStartCard={() => reorder.startDrag(displayIndex)}
        onDragOverCard={(before) =>
          reorder.handleDragOverCard(displayIndex, before)
        }
        onDragEndCard={() => reorder.endDrag()}
        onDropCard={reorder.handleDrop}
      />
    );
  };
}
