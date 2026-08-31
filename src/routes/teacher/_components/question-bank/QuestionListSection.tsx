import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Layers, Library } from "lucide-react";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import { QuestionAngleGroup } from "./QuestionAngleGroup";
import { createQuestionCardRenderer } from "./question-card-renderer";
import type { TranslateFn } from "./types";
import type {
  EditDraftController,
  ExpandedRowsController,
  QuestionBankIoController,
  QuestionMutationsController,
  QuestionReorderController,
  QuestionSelectionController,
} from "./question-card-renderer";
import type { ModuleGroup, OutcomeOption } from "./types";

/**
 * The question list itself: select-all row, the reorder-unavailable note, and
 * either the flat list or the module-grouped sections.
 *
 * Extracted verbatim from the former 2.4k-line question-bank.tsx — the same
 * element structure the render-time IIFE produced there.
 */
export interface QuestionListSectionProps {
  sorted: InterviewQuestionAuthoring[];
  filtered: InterviewQuestionAuthoring[];
  groupedByModule: ModuleGroup[];
  showModuleGroups: boolean;
  anyFilterActive: boolean;
  compact: boolean;
  outcomeOptions: OutcomeOption[];
  moduleTitleById: Map<string, string>;
  rows: ExpandedRowsController;
  mutations: QuestionMutationsController;
  edit: EditDraftController;
  bankIo: QuestionBankIoController;
  reorder: QuestionReorderController;
  selection: QuestionSelectionController;
  isPublished: boolean;
}

interface LogicalQuestionGroup {
  key: string;
  questions: InterviewQuestionAuthoring[];
}

function groupLogicalQuestions(
  questions: InterviewQuestionAuthoring[],
): LogicalQuestionGroup[] {
  const groups = new Map<string, InterviewQuestionAuthoring[]>();
  for (const question of questions) {
    const key = question.variant_group_id
      ? `variant:${question.variant_group_id}`
      : `question:${question.id}`;
    const group = groups.get(key);
    if (group) group.push(question);
    else groups.set(key, [question]);
  }
  return [...groups.entries()].map(([key, items]) => ({
    key,
    questions: items,
  }));
}

function renderLogicalQuestions(
  questions: InterviewQuestionAuthoring[],
  renderCard: (question: InterviewQuestionAuthoring) => ReactNode,
  t: TranslateFn,
  onApproveLogicalQuestion: (questions: InterviewQuestionAuthoring[]) => void,
  onDeleteLogicalQuestion: (questions: InterviewQuestionAuthoring[]) => void,
  deletingIds: Set<string>,
  approvingGroupId: string | null,
  bankIo: QuestionBankIoController,
  isPublished: boolean,
) {
  return groupLogicalQuestions(questions).map((group) =>
    group.questions[0]?.variant_group_id && group.questions.length >= 2 ? (
      <QuestionAngleGroup
        key={group.key}
        questions={group.questions}
        renderCard={renderCard}
        t={t}
        onApproveAll={onApproveLogicalQuestion}
        onDeleteLogicalQuestion={onDeleteLogicalQuestion}
        deletingGroupId={
          group.questions.some((question) => deletingIds.has(question.id))
            ? (group.questions[0]?.variant_group_id ?? group.questions[0]?.id ?? null)
            : null
        }
        approvingGroupId={approvingGroupId}
        onAddAllToBank={bankIo.handleAddLogicalGroupToBank}
        bankingGroupId={bankIo.bankingGroupId}
        groupAlreadyBanked={group.questions.some((question) =>
          bankIo.bankedPrompts.has(question.prompt_text.trim().toLowerCase()),
        )}
        isPublished={isPublished}
      />
    ) : (
      renderCard(group.questions[0])
    ),
  );
}

export function QuestionListSection(props: QuestionListSectionProps) {
  const { t } = useTranslation();
  const { filtered, groupedByModule, showModuleGroups, selection } = props;
  const hasVisibleVariantGroup = filtered.some(
    (question) => question.variant_group_id,
  );
  // Drag-to-reorder only makes sense on the flat, unfiltered list:
  // once filtered or grouped by module, the visible order no longer
  // maps 1:1 to persisted positions, so dropping would be ambiguous.
  //
  // This is NOT a rare edge case: `showModuleGroups` is true for any
  // bank spanning more than one source module, so for most real
  // courses drag is off by default and nothing ever told the
  // teacher why — the grip simply was not rendered. Reordering
  // itself still works through each card's move-to-top /
  // move-to-bottom menu, which operates in true position space, so
  // the note below points there rather than pretending the
  // capability is gone.
  const dndEnabled =
    !props.isPublished &&
    !showModuleGroups &&
    !props.anyFilterActive &&
    !hasVisibleVariantGroup;
  const renderCard = createQuestionCardRenderer({
    sorted: props.sorted,
    compact: props.compact,
    outcomeOptions: props.outcomeOptions,
    moduleTitleById: props.moduleTitleById,
    dndEnabled,
    isPublished: props.isPublished,
    t,
    rows: props.rows,
    mutations: props.mutations,
    edit: props.edit,
    bankIo: props.bankIo,
    reorder: props.reorder,
    selection,
  });
  // Explains the missing drag handle. Only shown when reordering is
  // actually unavailable, and worded for the reason it is
  // unavailable, since the two causes have different escape routes:
  // a filter can be cleared, module grouping cannot.
  const reorderNote = props.isPublished || dndEnabled ? null : (
    <p className="px-1 pb-1 text-[11px] leading-relaxed text-m3-on-surface-variant">
      {t(
        props.anyFilterActive
          ? "teacher_interview_config.qbank.reorder_off_filtered"
          : hasVisibleVariantGroup
            ? "teacher_interview_config.qbank.reorder_off_variant_group"
            : "teacher_interview_config.qbank.reorder_off_grouped",
      )}
    </p>
  );
  return (
    <div className="space-y-2">
      {/* Select-all row + contextual bulk-action bar */}
      {!props.isPublished && (
        <div className="flex items-center justify-between gap-2 flex-wrap px-1">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-m3-on-surface-variant cursor-pointer select-none">
          <input
            type="checkbox"
            checked={selection.allVisibleSelected}
            ref={(el) => {
              if (el) el.indeterminate = selection.someVisibleSelected;
            }}
            onChange={selection.toggleSelectAll}
            className="h-4 w-4 rounded border-m3-outline-variant/60 text-m3-primary focus:ring-2 focus:ring-m3-primary/30 cursor-pointer"
            aria-label={t("teacher_interview_config.qbank.bulk.select_all")}
          />
          {selection.selectedVisibleIds.length > 0
            ? t("teacher_interview_config.qbank.bulk.selected", {
                count: selection.selectedVisibleIds.length,
              })
            : t("teacher_interview_config.qbank.bulk.select_all")}
          </label>
        </div>
      )}

      {/* Flat list when there's only one module group (or no module
          data); grouped sections with headers otherwise. */}
      {!showModuleGroups ? (
        <>
          {reorderNote}
          <ul className="space-y-2" role="list">
            {renderLogicalQuestions(
              filtered,
              renderCard,
              t,
              props.mutations.handleApproveLogicalQuestion,
              props.mutations.handleDeleteLogicalQuestion,
              props.mutations.deletingIds,
              props.mutations.approvingGroupId,
              props.bankIo,
              props.isPublished,
            )}
          </ul>
        </>
      ) : (
        <div className="space-y-5">
          {reorderNote}
          {groupedByModule.map((g) => (
            <div key={g.key} className="space-y-2">
              <div className="flex items-center gap-1.5">
                {g.kind === "multi" ? (
                  <Layers className="h-3.5 w-3.5 text-m3-secondary" />
                ) : (
                  <Library className="h-3.5 w-3.5 text-m3-secondary" />
                )}
                <h4 className="text-xs font-bold uppercase tracking-wide text-m3-secondary">
                  {g.title}
                </h4>
                <span className="text-[11px] text-m3-on-surface-variant">
                  ({g.items.length})
                </span>
              </div>
              <ul className="space-y-2" role="list">
                {renderLogicalQuestions(
                  g.items,
                  renderCard,
                  t,
                  props.mutations.handleApproveLogicalQuestion,
                  props.mutations.handleDeleteLogicalQuestion,
                  props.mutations.deletingIds,
                  props.mutations.approvingGroupId,
                  props.bankIo,
                  props.isPublished,
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
