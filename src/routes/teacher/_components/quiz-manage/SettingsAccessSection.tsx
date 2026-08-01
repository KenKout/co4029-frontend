import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Field, SettingsSection, ToggleRow } from "./form-primitives";
import type { SettingsDraft, SettingsUpdate } from "./types";

/**
 * Access section: password, subnet allowlist and the browser-security switch.
 * Extracted from SettingsTab verbatim; the caller still supplies the
 * LockableSection wrapper it sits inside.
 */
export function SettingsAccessSection({
  draft,
  update,
}: {
  draft: SettingsDraft;
  update: SettingsUpdate;
}) {
  const { t } = useTranslation();

  return (
    <SettingsSection
      title={t("teacher_quiz_manage.settings.access.title")}
      description={t("teacher_quiz_manage.settings.access.description")}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("teacher_quiz_manage.settings.access.password_label")}
          hint={t("teacher_quiz_manage.settings.access.password_hint")}
        >
          <Input
            type="text"
            value={draft.require_password}
            onChange={(e) => update("require_password", e.target.value)}
            className="w-full"
            placeholder={t(
              "teacher_quiz_manage.settings.access.password_placeholder",
            )}
          />
        </Field>
        <Field
          label={t("teacher_quiz_manage.settings.access.subnet_label")}
          hint={t("teacher_quiz_manage.settings.access.subnet_hint")}
        >
          <Input
            type="text"
            value={draft.require_subnet}
            onChange={(e) => update("require_subnet", e.target.value)}
            className="w-full"
            placeholder="10.0.0.0/8, 192.168.1.5"
          />
        </Field>
      </div>
      <ToggleRow
        label={t("teacher_quiz_manage.settings.access.browser_security_label")}
        description={t(
          "teacher_quiz_manage.settings.access.browser_security_desc",
        )}
        value={draft.browser_security}
        onChange={(v) => update("browser_security", v)}
      />
    </SettingsSection>
  );
}
