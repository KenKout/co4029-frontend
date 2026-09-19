import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { useRegradeCommit, useRegradeDryRun, type RegradeRunRead } from "@/lib/api/hooks/quizzes";

export function RegradePanel({ quizId, onClose }: { quizId: string; onClose: () => void }) {
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
    try {
      const result = await commit.mutateAsync({});
      toast.success(t("teacher_quiz_results.regrade.committed", { count: result.answers_changed }));
      onClose();
    } catch {
      toast.error(t("teacher_quiz_results.regrade.commit_failed"));
    }
  }

  const busy = dryRun.isPending || commit.isPending;
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => { if (!open && !busy) onClose(); }}
      title={
        <span className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-m3-primary" />
          {t("teacher_quiz_results.regrade.title")}
        </span>
      }
      description={t("teacher_quiz_results.regrade.description")}
      confirmLabel={preview ? t("teacher_quiz_results.regrade.commit_action") : t("teacher_quiz_results.regrade.preview_action")}
      cancelLabel={t("common.cancel")}
      confirmVariant={preview ? "destructive" : "default"}
      isPending={busy}
      confirmDisabled={preview?.answers_changed === 0}
      onConfirm={() => void (preview ? handleCommit() : handleDryRun())}
      backdropClassName="z-30"
      popupClassName="max-w-2xl"
      extraContent={
        !preview ? (
          <div className="flex items-start gap-3 rounded-xl bg-m3-surface-container-low p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm text-m3-on-surface-variant">{t("teacher_quiz_results.regrade.dry_run_hint")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label={t("teacher_quiz_results.regrade.scanned")} value={preview.answers_scanned} />
              <Stat label={t("teacher_quiz_results.regrade.changed")} value={preview.answers_changed} highlight />
              <Stat label={t("teacher_quiz_results.regrade.attempts")} value={preview.attempts_affected} />
            </div>
            {preview.items.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-m3-outline-variant/30">
                <table className="w-full text-sm">
                  <thead className="bg-m3-surface-container-low text-m3-on-surface-variant"><tr>
                    <th className="px-3 py-2 text-left font-semibold">{t("teacher_quiz_results.regrade.col_change")}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t("teacher_quiz_results.regrade.col_old")}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t("teacher_quiz_results.regrade.col_new")}</th>
                  </tr></thead>
                  <tbody>{preview.items.map((item, index) => (
                    <tr key={`${item.attempt_id}-${item.question_id}-${index}`} className="border-t border-m3-outline-variant/20">
                      <td className="px-3 py-2"><span className={cn("inline-block rounded px-1.5 py-0.5 text-xs font-semibold", item.new_is_correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{item.old_is_correct ? "✓" : "✗"} → {item.new_is_correct ? "✓" : "✗"}</span></td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(item.old_points).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(item.new_points).toFixed(2)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )
      }
    />
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return <div className="rounded-xl bg-m3-surface-container-low p-3"><div className={cn("text-2xl font-bold tabular-nums", highlight ? "text-m3-primary" : "text-m3-on-surface")}>{value}</div><div className="text-xs text-m3-on-surface-variant">{label}</div></div>;
}
