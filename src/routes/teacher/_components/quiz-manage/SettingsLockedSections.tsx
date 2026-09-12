import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MasterySelector } from "../MasterySelector";
import { ReviewOptionsMatrix } from "./ReviewOptionsMatrix";
import { SettingsAccessSection } from "./SettingsAccessSection";
import { SettingsSection } from "./form-primitives";
import type { SettingsDraft, SettingsUpdate } from "./types";

/** Freeze mutation controls, never the disclosures needed to inspect them. */
export function SettingsLockedSections({ draft, update, setDraft, locked }: {
  draft: SettingsDraft;
  update: SettingsUpdate;
  setDraft: Dispatch<SetStateAction<SettingsDraft | null>>;
  locked: boolean;
}) {
  const { t } = useTranslation();
  return <>
    <Card><CardContent>
      <SettingsSection title={t("teacher_quiz_manage.settings.review.title")} description={t("teacher_quiz_manage.settings.review.description")}>
        <ReviewOptionsMatrix value={draft.review_options} disabled={locked} onChange={(next) => update("review_options", next)} />
      </SettingsSection>
    </CardContent></Card>
    <Card><CardContent>
      <SettingsSection title={t("teacher_quiz_manage.settings.spacing.title")} description={t("teacher_quiz_manage.settings.spacing.description")}>
        <MasterySelector disabled={locked} values={{ initial_ef: draft.initial_ef, min_ef_for_unlock: draft.min_ef_for_unlock, coverage_threshold: draft.coverage_threshold }}
          onPatch={(patch) => setDraft((current) => current ? { ...current, ...patch } : current)} />
      </SettingsSection>
    </CardContent></Card>
    <Card><CardContent>
      <SettingsAccessSection draft={draft} update={update} locked={locked} />
    </CardContent></Card>
  </>;
}
