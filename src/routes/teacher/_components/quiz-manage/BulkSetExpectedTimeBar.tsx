import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, Loader2, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  /** Stage every selected question for deletion (combo-undo window). */
  onDeleteSelected: () => void;
}) {
  const { t } = useTranslation();
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
      {/* ── Selection row: one line, never wraps ── */}
      <div className="flex items-center gap-3 px-4 py-2">
        <label className="flex items-center gap-2.5 cursor-pointer select-none min-w-0">
          <input
            type="checkbox"
            checked={hasSelection && allSelected}
            /* Indeterminate when a partial subset is selected — reads as
               "some selected" instead of an empty box. */
            ref={(el) => {
              if (el) el.indeterminate = hasSelection && !allSelected;
            }}
            onChange={() => (allSelected ? onClear() : onSelectAll())}
            className="h-4 w-4 shrink-0 accent-m3-primary cursor-pointer"
            aria-label={t("teacher_quiz_manage.bulk_time.select_all")}
          />
          <span
            className={cn(
              "text-sm truncate",
              hasSelection
                ? "font-bold text-m3-on-surface"
                : "text-m3-on-surface-variant",
            )}
          >
            {hasSelection
              ? t("teacher_quiz_manage.bulk_time.selected_count", {
                  selected: selectedCount,
                  total: totalQuestions,
                })
              : t("teacher_quiz_manage.bulk_time.idle_hint")}
          </span>
        </label>

        {/* Right-hand anchor so the bar always has two edges of content
            instead of one label floating in dead space. Idle shows the
            question count; active swaps in the clear-selection action. */}
        {hasSelection ? (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-on-surface transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            {t("teacher_quiz_manage.bulk_time.deselect")}
          </button>
        ) : (
          <span className="ml-auto shrink-0 text-xs font-semibold text-m3-on-surface-variant tabular-nums">
            {t("teacher_quiz_manage.bulk_time.question_count", {
              count: totalQuestions,
            })}
          </span>
        )}
      </div>

      {/* ── Action zone: only rendered when there IS a selection, so the idle
             bar stays a single quiet line with no disabled controls. ── */}
      {hasSelection && (
        <div className="border-t border-m3-outline-variant/20 px-4 py-2.5 flex flex-wrap items-center gap-x-2 gap-y-2">
          {/* Group 1: set expected time. Input + Apply are welded together as
              a single segmented control — they are one action, so they must
              never be split across a line break. The "sec" unit sits OUTSIDE
              the input (as a bordered affix) so it doesn't visually collide
              with the adjacent button label. */}
          <div className="flex items-center">
            <Clock
              className="h-4 w-4 text-m3-secondary mr-2 shrink-0"
              aria-hidden
            />
            <div className="flex items-stretch">
              <Input
                type="number"
                min={1}
                step={1}
                value={bulkSeconds}
                onChange={(e) => onBulkSecondsChange(e.target.value)}
                aria-label={t("teacher_quiz_manage.bulk_time.duration_seconds")}
                title={t("teacher_quiz_manage.bulk_time.duration_seconds")}
                className="h-9 w-16 rounded-r-none border-r-0 bg-m3-surface text-sm tabular-nums"
              />
              <span
                className="flex items-center border border-l-0 border-m3-outline-variant/40 bg-m3-surface-container-high px-2 text-xs font-semibold text-m3-on-surface-variant"
                aria-hidden
              >
                {t("teacher_quiz_manage.bulk_time.seconds_suffix")}
              </span>
              {/* Secondary weight on purpose: green Approve is the primary
                  action in this row, so two filled buttons side by side would
                  give the eye no hierarchy to read. */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!applyValid || applying}
                onClick={onApply}
                className="h-9 gap-1.5 rounded-l-none border-l-0"
              >
                {applying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {t("teacher_quiz_manage.bulk_time.apply_short")}
              </Button>
            </div>
          </div>

          {/* Group 2: approve */}
          <Button
            type="button"
            size="sm"
            disabled={!approveValid || approving}
            onClick={onApprove}
            className="h-9 gap-1.5 bg-emerald-600 text-white border-0 hover:bg-emerald-700"
          >
            {approving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {t("teacher_quiz_manage.bulk_time.approve_short")}
          </Button>

          {/* Group 3: destructive, pushed to the far edge and visually split
              from the constructive actions above. No confirm dialog: the
              delete is staged into the combo-undo window, so the undo
              snackbar is the safety net. */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDeleteSelected}
            className="h-9 ml-auto gap-1.5 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("teacher_quiz_manage.bulk_time.delete_short")}
          </Button>
        </div>
      )}
    </div>
  );
}
