import { useTranslation } from "react-i18next";
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MasterySelector } from "../MasterySelector";
import { ReviewOptionsMatrix } from "./ReviewOptionsMatrix";
import { SettingsAccessSection } from "./SettingsAccessSection";
import { LockableSection, SettingsSection } from "./form-primitives";
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
      <Collapsible.Root>
        <Collapsible.Trigger render={<Button type="button" variant="ghost" className="w-full justify-between whitespace-normal h-auto text-left" />}>
          {t("teacher_quiz_manage.settings.access.title")}<ChevronDown className="h-4 w-4 shrink-0" />
        </Collapsible.Trigger>
        <Collapsible.Panel className="pt-4">
          <LockableSection locked={locked}><SettingsAccessSection draft={draft} update={update} /></LockableSection>
        </Collapsible.Panel>
      </Collapsible.Root>
    </CardContent></Card>
  </>;
}
