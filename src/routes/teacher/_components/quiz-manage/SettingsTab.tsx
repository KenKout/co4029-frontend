import * as React from "react";
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
  draft,
  setDraft,
  onSubmit,
  saving,
  dirty,
  onReset,
  locked = false,
}: {
  quizId: string;
  draft: SettingsDraft;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  dirty: boolean;
  onReset: () => void;
  /** Published quiz: freeze the non-student-safe sections. Title,
   *  description, schedule, and reminders stay editable. */
  locked?: boolean;
}) {
  function update<K extends keyof SettingsDraft>(
    key: K,
    value: SettingsDraft[K],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl p-6 lg:p-8 space-y-8 shadow-glass"
    >
      <SettingsGeneralSection draft={draft} update={update} />

      <SettingsScoringSection draft={draft} update={update} locked={locked} />

      <SettingsAttemptsSection draft={draft} update={update} locked={locked} />

      {/* Schedule stays editable on a published quiz — extending a deadline
          or shifting the open/close window doesn't disrupt a live attempt. */}
      <SettingsScheduleSection draft={draft} update={update} />

      <SettingsBehaviorSection draft={draft} update={update} locked={locked} />

      <SettingsLockedSections
        quizId={quizId}
        draft={draft}
        update={update}
        setDraft={setDraft}
        locked={locked}
      />

      <SettingsSaveBar saving={saving} dirty={dirty} onReset={onReset} />
    </form>
  );
}
