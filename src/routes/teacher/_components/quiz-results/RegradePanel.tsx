import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import {
  useRegradeCommit,
  useRegradeDryRun,
  type RegradeItemRead,
  type RegradeRunRead,
} from "@/lib/api/hooks/quizzes";

/** One preview row plus the positional key the table needs. */
type RegradeRow = RegradeItemRead & { rowId: string };

function regradeColumns(
  t: (key: string) => string,
): DataTableColumn<RegradeRow>[] {
  return [
    {
      id: "change",
      header: t("teacher_quiz_results.regrade.col_change"),
      cellClassName: "px-3 py-2",
      headerClassName: "px-3 py-2",
      cell: (item) => (
        <span
          className={cn(
            "inline-block rounded px-1.5 py-0.5 text-xs font-semibold",
            item.new_is_correct
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700",
          )}
        >
          {item.old_is_correct ? "✓" : "✗"} → {item.new_is_correct ? "✓" : "✗"}
        </span>
      ),
    },
    {
      id: "old",
      header: t("teacher_quiz_results.regrade.col_old"),
      align: "right",
      cellClassName: "px-3 py-2 tabular-nums",
      headerClassName: "px-3 py-2",
      cell: (item) => Number(item.old_points).toFixed(2),
    },
    {
      id: "new",
      header: t("teacher_quiz_results.regrade.col_new"),
      align: "right",
      cellClassName: "px-3 py-2 tabular-nums",
      headerClassName: "px-3 py-2",
      cell: (item) => Number(item.new_points).toFixed(2),
    },
  ];
}

export function RegradePanel({
  quizId,
  onClose,
}: {
  quizId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const dryRun = useRegradeDryRun(quizId);
  const commit = useRegradeCommit(quizId);
  const [preview, setPreview] = useState<RegradeRunRead | null>(null);

  async function handleDryRun() {
    try {
      setPreview(await dryRun.mutateAsync({}));
    } catch {
      toast.error(t("teacher_quiz_results.regrade.dry_run_failed"));
    }
  }

  async function handleCommit() {
    if (!preview) return;
    try {
      const result = await commit.mutateAsync(preview.id);
      toast.success(
        t("teacher_quiz_results.regrade.committed", {
          count: result.answers_changed,
        }),
      );
      onClose();
    } catch {
      toast.error(t("teacher_quiz_results.regrade.commit_failed"));
    }
  }

  const busy = dryRun.isPending || commit.isPending;
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={
        <span className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-m3-primary" />
          {t("teacher_quiz_results.regrade.title")}
        </span>
      }
      description={t("teacher_quiz_results.regrade.description")}
      confirmLabel={
        preview
          ? t("teacher_quiz_results.regrade.commit_action")
          : t("teacher_quiz_results.regrade.preview_action")
      }
      cancelLabel={t("common.cancel")}
      confirmVariant={preview ? "destructive" : "default"}
      isPending={busy}
      confirmDisabled={preview?.answers_changed === 0}
      onConfirm={() => void (preview ? handleCommit() : handleDryRun())}
      popupClassName="max-w-2xl"
      extraContent={
        !preview ? (
          <div className="space-y-3 rounded-xl bg-m3-surface-container-low p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-m3-on-surface-variant">
                {t("teacher_quiz_results.regrade.dry_run_hint")}
              </p>
            </div>
            <ul className="ml-8 list-disc space-y-1 text-sm text-m3-on-surface-variant">
              <li>{t("teacher_quiz_results.regrade.scope_hint")}</li>
              <li>{t("teacher_quiz_results.regrade.exclusion_hint")}</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-center">
              <Stat
                label={t("teacher_quiz_results.regrade.changed")}
                value={preview.answers_changed}
                highlight
              />
              <Stat
                label={t("teacher_quiz_results.regrade.attempts")}
                value={preview.attempts_affected}
              />
            </div>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              {t("teacher_quiz_results.regrade.commit_hint")}
            </p>
            {preview.items.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-m3-outline-variant/30">
                <DataTable<RegradeRow>
                  columns={regradeColumns(t)}
                  data={preview.items.map((item, index) => ({
                    ...item,
                    rowId: `${item.attempt_id}-${item.question_id}-${index}`,
                  }))}
                  getRowId={(item) => item.rowId}
                  bordered={false}
                  containerClassName="space-y-0"
                />
              </div>
            )}
          </div>
        )
      }
    />
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-m3-surface-container-low p-3">
      <div
        className={cn(
          "text-2xl font-bold tabular-nums",
          highlight ? "text-m3-primary" : "text-m3-on-surface",
        )}
      >
        {value}
      </div>
      <div className="text-xs text-m3-on-surface-variant">{label}</div>
    </div>
  );
}
