import { memo } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, SettingsSection } from "./form-primitives";
import type { SettingsDraft, SettingsUpdate } from "./types";

/**
 * General section of the settings form: title + description. Stays editable on
 * a published quiz. Extracted from SettingsTab verbatim.
 */
function SettingsGeneralSectionComponent({
  draft,
  update,
}: {
  draft: SettingsDraft;
  update: SettingsUpdate;
}) {
  const { t } = useTranslation();

  return (
    <SettingsSection
      title={t("teacher_quiz_manage.settings.general.title")}
      description={t("teacher_quiz_manage.settings.general.description")}
    >
      <Field label={t("teacher_quiz_manage.settings.general.title_label")}>
        <Input
          required
          aria-label={t("teacher_quiz_manage.settings.general.title_label")}
          value={draft.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder={t(
            "teacher_quiz_manage.settings.general.title_placeholder",
          )}
        />
      </Field>
      <Field label={t("teacher_quiz_manage.settings.general.desc_label")}>
        <Textarea
          aria-label={t("teacher_quiz_manage.settings.general.desc_label")}
          value={draft.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          placeholder={t(
            "teacher_quiz_manage.settings.general.desc_placeholder",
          )}
        />
      </Field>
    </SettingsSection>
  );
}

export const SettingsGeneralSection = memo(
  SettingsGeneralSectionComponent,
  (previous, next) =>
    previous.update === next.update &&
    previous.draft.title === next.draft.title &&
    previous.draft.description === next.draft.description,
);
