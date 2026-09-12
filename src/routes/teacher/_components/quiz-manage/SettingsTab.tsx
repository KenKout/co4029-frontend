import * as React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/use-confirm";
import { FeedbackBandsPanel } from "./FeedbackBandsPanel";
import { OverridesPanel } from "./OverridesPanel";
import { SettingsSection } from "./form-primitives";
import { SettingsSummary } from "./SettingsSummary";
import { SettingsAttemptsSection } from "./SettingsAttemptsSection";
import { SettingsBehaviorSection } from "./SettingsBehaviorSection";
import { SettingsGeneralSection } from "./SettingsGeneralSection";
import { SettingsLockedSections } from "./SettingsLockedSections";
import { SettingsSaveBar } from "./SettingsSaveBar";
import { SettingsScheduleSection } from "./SettingsScheduleSection";
import { SettingsScoringSection } from "./SettingsScoringSection";
import type { SettingsDraft } from "./types";

/**
 * Settings tab: the full quiz configuration form. Field-aware when the quiz
 * is published — student-safe fields stay editable, the rest lock per section.
 *
 * Extracted from the former 3.5k-line quiz-manage.tsx; behaviour unchanged.
 * Each section now lives in its own Settings*Section component, so this file is
 * the form shell plus the one-field `update` writer they all share.
 */
export function SettingsTab({
  quizId,
  courseId,
  onFeedbackDirtyChange,
  onOverrideDirtyChange,
  draft,
  savedDraft,
  setDraft,
  onSubmit,
  saving,
  dirty,
  onReset,
  locked = false,
}: {
  quizId: string;
  courseId: string;
  onFeedbackDirtyChange: (dirty: boolean) => void;
  onOverrideDirtyChange: (dirty: boolean) => void;
  draft: SettingsDraft;
  savedDraft: SettingsDraft;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  dirty: boolean;
  onReset: () => void;
  /** Published quiz: freeze the non-student-safe sections. Title,
   *  description, schedule, and reminders stay editable. */
  locked?: boolean;
}) {
  const { t } = useTranslation();
  const { confirm, dialog } = useConfirm();
  function update<K extends keyof SettingsDraft>(
    key: K,
    value: SettingsDraft[K],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
      <div className="min-w-0 space-y-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <fieldset disabled={saving} className="min-w-0 border-0 p-0 space-y-6">
            <Card><CardContent><SettingsGeneralSection draft={draft} update={update} /></CardContent></Card>
            <Card><CardContent><SettingsScheduleSection draft={draft} update={update} locked={locked} /></CardContent></Card>
            <Card><CardContent className="space-y-6">
              <SettingsAttemptsSection draft={draft} update={update} locked={locked} />
              <SettingsScoringSection draft={draft} update={update} locked={locked} />
            </CardContent></Card>
            <Card><CardContent><SettingsBehaviorSection draft={draft} update={update} locked={locked} /></CardContent></Card>
            <SettingsLockedSections draft={draft} update={update} setDraft={setDraft} locked={locked} />
          </fieldset>
          <SettingsSaveBar saving={saving} dirty={dirty} onReset={() => {
            void confirm({ title: t("common.unsaved.title"), description: t("common.unsaved.description"), confirmLabel: t("teacher_quiz_manage.settings.reset_button"), cancelLabel: t("common.cancel") }).then((ok) => { if (ok) onReset(); });
          }} />
        </form>
        <p className="text-sm text-m3-on-surface-variant">{t("teacher_quiz_manage.settings.assist.separate_saves")}</p>
        <Card><CardContent>
          <SettingsSection title={t("teacher_quiz_manage.settings.feedback.title")} description={t("teacher_quiz_manage.settings.feedback.description")}>
            <FeedbackBandsPanel quizId={quizId} locked={locked} onDirtyChange={onFeedbackDirtyChange} />
          </SettingsSection>
        </CardContent></Card>
        <Card><CardContent>
          <SettingsSection title={t("teacher_quiz_manage.settings.overrides.title")} description={t("teacher_quiz_manage.settings.overrides.description")}>
            <OverridesPanel quizId={quizId} courseId={courseId} base={savedDraft} locked={locked} onDirtyChange={onOverrideDirtyChange} />
          </SettingsSection>
        </CardContent></Card>
      </div>
      <aside className="min-w-0 xl:sticky xl:top-36"><SettingsSummary draft={draft} dirty={dirty} /></aside>
      {dialog}
    </div>
  );
}
