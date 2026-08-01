import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Field, SettingsSection } from "./form-primitives";
import type { SettingsDraft, SettingsUpdate } from "./types";

/**
 * General section of the settings form: title + description. Stays editable on
 * a published quiz. Extracted from SettingsTab verbatim.
 */
export function SettingsGeneralSection({
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
          value={draft.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder={t(
            "teacher_quiz_manage.settings.general.title_placeholder",
          )}
        />
      </Field>
      <Field label={t("teacher_quiz_manage.settings.general.desc_label")}>
        <textarea
          value={draft.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          placeholder={t(
            "teacher_quiz_manage.settings.general.desc_placeholder",
          )}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        />
      </Field>
    </SettingsSection>
  );
}
