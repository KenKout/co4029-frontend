import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Selection row of the bulk action bar: one line, never wraps. Extracted from
 * BulkSetExpectedTimeBar verbatim.
 */
export function BulkSetExpectedTimeRow({
  totalQuestions,
  selectedCount,
  hasSelection,
  allSelected,
  onSelectAll,
  onClear,
}: {
  totalQuestions: number;
  selectedCount: number;
  hasSelection: boolean;
  allSelected: boolean;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();

  return (
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
        <Button variant="ghost"
          type="button"
          onClick={onClear}
          className="ml-auto shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-on-surface transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          {t("teacher_quiz_manage.bulk_time.deselect")}
        </Button>
      ) : (
        <span className="ml-auto shrink-0 text-xs font-semibold text-m3-on-surface-variant tabular-nums">
          {t("teacher_quiz_manage.bulk_time.question_count", {
            count: totalQuestions,
          })}
        </span>
      )}
    </div>
  );
}
