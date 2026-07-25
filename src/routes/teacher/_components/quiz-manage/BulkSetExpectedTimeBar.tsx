import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, Loader2, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Bulk action bar for the Questions tab: applies one expected response time
 * (or an approval) to every selected question.
 *
 * Extracted from the former 3.5k-line quiz-manage.tsx; behaviour unchanged.
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
  return (
    // Inline bulk-action bar (not sticky): it emphasizes (primary tint) only
    // when questions are selected; otherwise it stays a quiet neutral bar.
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-wrap items-center gap-3 shadow-glass transition-colors",
        hasSelection
          ? "border-m3-primary/30 bg-m3-primary-fixed/20"
          : "border-m3-outline-variant/20 bg-m3-surface-container-lowest",
      )}
    >
      <div className="flex items-center gap-2 text-sm text-m3-on-surface">
        <Clock className="h-4 w-4 text-m3-secondary" />
        <span className="font-bold">
          {t("teacher_quiz_manage.bulk_time.title")}
        </span>
        <Badge className="border-0 bg-m3-surface-container-high text-m3-on-surface text-[11px] font-bold rounded-full px-2 py-0.5">
          {t("teacher_quiz_manage.bulk_time.selected_count", {
            selected: selectedCount,
            total: totalQuestions,
          })}
        </Badge>
      </div>
      {/* Compact seconds input: a narrow field with an inline "sec" suffix
          so it reads as a seconds input without the wide label eating space. */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative">
          <Input
            type="number"
            min={1}
            step={1}
            value={bulkSeconds}
            onChange={(e) => onBulkSecondsChange(e.target.value)}
            aria-label={t("teacher_quiz_manage.bulk_time.duration_seconds")}
            title={t("teacher_quiz_manage.bulk_time.duration_seconds")}
            className="bg-m3-surface text-sm w-20 pr-9 tabular-nums"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-m3-on-surface-variant">
            {t("teacher_quiz_manage.bulk_time.seconds_suffix")}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap ml-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSelectAll}
          disabled={totalQuestions === 0}
        >
          {t("teacher_quiz_manage.bulk_time.select_all")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={selectedCount === 0}
        >
          {t("teacher_quiz_manage.bulk_time.deselect")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!applyValid || applying}
          onClick={onApply}
          className="gap-2 gradient-primary text-white border-0"
        >
          {applying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {t("teacher_quiz_manage.bulk_time.apply")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!approveValid || approving}
          onClick={onApprove}
          className="gap-2 bg-emerald-600 text-white border-0 hover:bg-emerald-700"
        >
          {approving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {t("teacher_quiz_manage.bulk_time.approve_selected")}
        </Button>
        {/* Destructive, so it sits last and is visually separated. No confirm
            dialog on purpose: the delete is STAGED into the existing combo-undo
            window (nothing hits the server yet), so the undo snackbar is the
            safety net rather than a modal. */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!hasSelection}
          onClick={onDeleteSelected}
          className="gap-2 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("teacher_quiz_manage.bulk_time.delete_selected", {
            count: selectedCount,
          })}
        </Button>
      </div>
    </div>
  );
}
