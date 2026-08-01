import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import {
  Field,
  LockableSection,
  SettingsSection,
  ToggleRow,
} from "./form-primitives";
import type { SettingsDraft, SettingsUpdate } from "./types";

/**
 * Attempts section: the retake switch plus the max-attempts / cooldown pair it
 * reveals. Frozen once published. Extracted from SettingsTab verbatim.
 */
export function SettingsAttemptsSection({
  draft,
  update,
  locked,
}: {
  draft: SettingsDraft;
  update: SettingsUpdate;
  locked: boolean;
}) {
  const { t } = useTranslation();

  return (
    <LockableSection locked={locked}>
      <SettingsSection title={t("teacher_quiz_manage.settings.attempts.title")}>
        <ToggleRow
          label={t("teacher_quiz_manage.settings.attempts.allow_label")}
          description={t("teacher_quiz_manage.settings.attempts.allow_desc")}
          value={draft.allow_retakes}
          onChange={(v) => update("allow_retakes", v)}
        />
        {draft.allow_retakes && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <Field
              label={t("teacher_quiz_manage.settings.attempts.max_label")}
              hint={t("teacher_quiz_manage.settings.attempts.max_hint")}
            >
              <Input
                type="number"
                min={1}
                value={draft.max_attempts}
                onChange={(e) => update("max_attempts", e.target.value)}
                placeholder={t(
                  "teacher_quiz_manage.settings.attempts.max_placeholder",
                )}
              />
            </Field>
            <Field
              label={t("teacher_quiz_manage.settings.attempts.cooldown_label")}
              hint={t("teacher_quiz_manage.settings.attempts.cooldown_hint")}
            >
              <Input
                type="number"
                min={0}
                value={draft.cooldown_hours}
                onChange={(e) => update("cooldown_hours", e.target.value)}
                placeholder={t(
                  "teacher_quiz_manage.settings.attempts.cooldown_placeholder",
                )}
              />
            </Field>
          </div>
        )}
      </SettingsSection>
    </LockableSection>
  );
}
