import { cn } from "@/lib/utils";
import { BulkSetExpectedTimeActions } from "./BulkSetExpectedTimeActions";
import { BulkSetExpectedTimeRow } from "./BulkSetExpectedTimeRow";

/**
 * Bulk action bar for the Questions tab.
 *
 * Layout rationale — the previous version crammed a title, a count badge, a
 * seconds input and FIVE buttons onto one flex row, so it always wrapped into a
 * ragged two-line block. This version is a *contextual* toolbar instead:
 *
 * - **Idle** (nothing selected): one short line — a select-all checkbox plus a
 *   hint. No dead buttons, no wrapping.
 * - **Active** (>=1 selected): the action zone appears beneath a divider, with
 *   controls grouped by concern so a narrow viewport breaks BETWEEN groups
 *   rather than mid-control:
 *     [ 60 sec | Apply ]  [ Approve ]   ...   [ Delete ]
 *   The seconds input is welded to its own Apply button (they are one action),
 *   and the destructive Delete is pushed to the far edge, separated from the
 *   constructive actions.
 */
export function BulkSetExpectedTimeBar({
  totalQuestions,
  selectedCount,
  bulkSeconds,
  onBulkSecondsChange,
  onSelectAll,
  onClear,
  onApply,
  applyValid,
  applying,
  onApprove,
  approveValid,
  approving,
  onAddToBank,
  addingToBank,
  onDeleteSelected,
}: {
  totalQuestions: number;
  selectedCount: number;
  bulkSeconds: string;
  onBulkSecondsChange: (value: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onApply: () => void | Promise<void>;
  applyValid: boolean;
  applying: boolean;
  onApprove: () => void | Promise<void>;
  approveValid: boolean;
  approving: boolean;
  onAddToBank: () => void;
  addingToBank: boolean;
  /** Stage every selected question for deletion (combo-undo window). */
  onDeleteSelected: () => void;
}) {
  if (totalQuestions === 0) return null;

  const hasSelection = selectedCount > 0;
  const allSelected = selectedCount === totalQuestions;

  return (
    <div
      className={cn(
        "rounded-xl border shadow-glass transition-colors",
        hasSelection
          ? "border-m3-primary/30 bg-m3-primary-fixed/20"
          : "border-m3-outline-variant/20 bg-m3-surface-container-lowest",
      )}
    >
      <BulkSetExpectedTimeRow
        totalQuestions={totalQuestions}
        selectedCount={selectedCount}
        hasSelection={hasSelection}
        allSelected={allSelected}
        onSelectAll={onSelectAll}
        onClear={onClear}
      />

      {hasSelection && (
        <BulkSetExpectedTimeActions
          bulkSeconds={bulkSeconds}
          onBulkSecondsChange={onBulkSecondsChange}
          onApply={onApply}
          applyValid={applyValid}
          applying={applying}
          onApprove={onApprove}
          approveValid={approveValid}
          approving={approving}
          onAddToBank={onAddToBank}
          addingToBank={addingToBank}
          onDeleteSelected={onDeleteSelected}
        />
      )}
    </div>
  );
}
