import { useState } from "react";
import { History, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { SectionErrorBox } from "@/components/ui/section-error-box";
import { Textarea } from "@/components/ui/textarea";
import {
  useRollbackSettingChange,
  useSettingChanges,
  type SettingChange,
} from "@/lib/api/hooks/admin-settings";
import { useFormatDateTime } from "@/lib/format/date";

/**
 * Change history with rollback (PRD ADM-031/033).
 *
 * Every row shows the four things an audit trail is for — who, when, what it
 * was, and why — and offers to put it back. Rollback appends a new change
 * rather than editing this list, so the record of the change being undone
 * survives the undo.
 */
export function ChangeHistorySection({ orgId }: { orgId?: string }) {
  const { t } = useTranslation();
  const formatDateTime = useFormatDateTime();
  const history = useSettingChanges(orgId);
  const rollback = useRollbackSettingChange(orgId);
  // A rollback is itself a configuration change, so it collects its own reason
  // rather than inheriting the one it is undoing.
  const [target, setTarget] = useState<SettingChange | null>(null);
  const [reason, setReason] = useState("");
  const [rollingBack, setRollingBack] = useState(false);

  async function confirmRollback() {
    if (!target || reason.trim().length < 3) return;
    setRollingBack(true);
    try {
      await rollback.mutateAsync({
        changeId: target.id,
        reason: reason.trim(),
      });
      toast.success(t("admin_settings.history.rolled_back"));
      setTarget(null);
      setReason("");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin_settings.history.rollback_failed"),
      );
    } finally {
      setRollingBack(false);
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="settings-history">
      <h2
        id="settings-history"
        className="flex items-center gap-2 text-sm font-semibold text-text-strong"
      >
        <History aria-hidden="true" className="h-4 w-4" />
        {t("admin_settings.history.title")}
      </h2>

      {history.isError ? (
        <SectionErrorBox messageKey="admin_settings.history.load_failed" />
      ) : (history.data ?? []).length === 0 ? (
        <p className="rounded-lg border border-border bg-card px-5 py-4 text-sm text-text-muted">
          {t("admin_settings.history.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {(history.data ?? []).map((change) => (
            <li key={change.id} className="flex items-start gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-text-muted">
                    {change.setting_key}
                  </span>
                  <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-muted">
                    {t(`admin_settings.history.action.${change.action}`)}
                  </span>
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-text-strong">
                  <ValueChip
                    value={change.before_value}
                    inheritedLabel={t("admin_settings.history.inherited")}
                  />
                  <span aria-hidden="true" className="text-text-subtle">
                    →
                  </span>
                  <ValueChip
                    value={change.after_value}
                    inheritedLabel={t("admin_settings.history.inherited")}
                  />
                </p>
                <p className="mt-1 text-xs text-text-muted">{change.reason}</p>
                <p className="mt-0.5 text-xs text-text-subtle">
                  {t("admin_settings.history.by", {
                    actor:
                      change.actor_email ??
                      t("admin_settings.history.unknown_actor"),
                    at: formatDateTime(change.created_at),
                  })}
                </p>
              </div>

              <Button
                variant="ghost"
                className="shrink-0"
                disabled={rollingBack}
                onClick={() => {
                  setTarget(change);
                  setReason("");
                }}
              >
                <Undo2 aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                {t("admin_settings.history.rollback")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <PromptDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTarget(null);
            setReason("");
          }
        }}
        title={t("admin_settings.history.rollback_title")}
        description={t("admin_settings.history.rollback_description", {
          key: target?.setting_key ?? "",
        })}
        confirmLabel={t("admin_settings.history.rollback_confirm")}
        isPending={rollingBack || reason.trim().length < 3}
        onConfirm={() => void confirmRollback()}
      >
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          aria-label={t("admin_settings.history.rollback_placeholder")}
          placeholder={t("admin_settings.history.rollback_placeholder")}
        />
      </PromptDialog>
    </section>
  );
}

/**
 * One side of a change. `null` is rendered as "inherited", not as an empty
 * chip: the difference between "was 800" and "was inherited" is what decides
 * whether a rollback re-pins a value or restores inheritance.
 */
function ValueChip({
  value,
  inheritedLabel,
}: {
  value: boolean | number | null;
  inheritedLabel: string;
}) {
  if (value === null) {
    return (
      <span className="rounded bg-surface-muted px-1.5 py-0.5 text-xs italic text-text-muted">
        {inheritedLabel}
      </span>
    );
  }
  return (
    <span className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs tabular-nums">
      {String(value)}
    </span>
  );
}
