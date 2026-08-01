/**
 * The two confirmation dialogs of the interview-config page: deleting the config,
 * and leaving the Settings tab with unsaved edits.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 7 of that file's
 * decomposition). The page still owns the dirty state and the pending tab — this
 * only renders the prompts, so the guard keeps registering at exactly the same
 * point in the page's lifecycle.
 */

import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { TabId } from "@/lib/interview/config-draft";

export function ConfigDialogs({
  confirmDelete,
  onConfirmDeleteOpenChange,
  configTitle,
  deletePending,
  onConfirmDelete,
  pendingTab,
  onClearPendingTab,
  savePending,
  onSaveAndSwitch,
  onDiscardAndSwitch,
}: {
  confirmDelete: boolean;
  onConfirmDeleteOpenChange: (open: boolean) => void;
  configTitle: string;
  deletePending: boolean;
  onConfirmDelete: () => void;
  pendingTab: TabId | null;
  onClearPendingTab: () => void;
  savePending: boolean;
  onSaveAndSwitch: () => void;
  onDiscardAndSwitch: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={onConfirmDeleteOpenChange}
        title={t("teacher_interview_config.confirm_delete.title")}
        description={t("teacher_interview_config.confirm_delete.body", {
          title: configTitle,
        })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={onConfirmDelete}
        isPending={deletePending}
      />

      {/* Unsaved Settings changes, raised when leaving the Settings tab.
          Non-destructive: "Later" keeps the draft (panels stay mounted) and just
          switches, so the confirm button is `default`, not `destructive`.
          Dismissing (Escape / backdrop) cancels the switch and stays on
          Settings — the safe default when the intent is unclear. */}
      <ConfirmDialog
        open={pendingTab !== null}
        onOpenChange={(open) => {
          if (!open) onClearPendingTab();
        }}
        title={t("teacher_interview_config.confirm_unsaved.title")}
        description={t("teacher_interview_config.confirm_unsaved.body")}
        confirmLabel={t("teacher_interview_config.confirm_unsaved.confirm")}
        cancelLabel={t("teacher_interview_config.confirm_unsaved.cancel")}
        confirmVariant="default"
        onConfirm={onSaveAndSwitch}
        onCancel={onDiscardAndSwitch}
        isPending={savePending}
        dismissOnBackdrop
      />
    </>
  );
}
