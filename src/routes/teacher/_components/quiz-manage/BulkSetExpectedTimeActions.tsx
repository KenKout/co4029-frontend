import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, Loader2, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Action zone of the bulk action bar. Only rendered when there IS a selection,
 * so the idle bar stays a single quiet line with no disabled controls.
 * Extracted from BulkSetExpectedTimeBar verbatim.
 */
export function BulkSetExpectedTimeActions({
  bulkSeconds,
  onBulkSecondsChange,
  onApply,
  applyValid,
  applying,
  onApprove,
  approveValid,
  approving,
  onDeleteSelected,
}: {
  bulkSeconds: string;
  onBulkSecondsChange: (value: string) => void;
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

  return (
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
            className="h-9 w-16 rounded-r-none border-r-0 tabular-nums"
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
  );
}
