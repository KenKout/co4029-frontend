import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SettingsSummary } from "@/routes/teacher/_components/quiz-manage/SettingsSummary";
import type { SettingsDraft, TabKey } from "@/routes/teacher/_components/quiz-manage/types";

/** Confirm the persisted configuration, never an unsaved form preview. */
export function ConfirmPublishQuizDialog({ tab, approvedCount, draft, pending, disabled, onCancel, onPreview, onConfirm }: {
  tab: TabKey; approvedCount: number; draft: SettingsDraft;
  pending: boolean; disabled?: boolean;
  onCancel: () => void; onPreview: () => void; onConfirm: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return <ConfirmDialog open onOpenChange={(open) => { if (!open && !pending) onCancel(); }}
    title={t("teacher_quiz_manage.confirm_publish.title")}
    description={t(`teacher_quiz_manage.confirm_publish.${tab === "preview" ? "body_confirm" : "body_preview"}`, { count: approvedCount })}
    confirmLabel={t("teacher_quiz_manage.actions.publish")} cancelLabel={t("common.cancel")}
    confirmVariant="default" isPending={pending} confirmDisabled={disabled}
    onConfirm={() => void onConfirm()}
    extraContent={<div className="space-y-3">
      <div className="max-h-[50vh] overflow-y-auto"><SettingsSummary draft={draft} /></div>
      {tab !== "preview" && <Button type="button" variant="outline" disabled={pending} onClick={onPreview}>{t("teacher_quiz_manage.actions.preview")}</Button>}
    </div>}
  />;
}
