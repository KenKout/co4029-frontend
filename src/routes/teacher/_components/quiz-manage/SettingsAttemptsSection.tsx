import { memo } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { DurationField } from "@/components/ui/duration-field";
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
function SettingsAttemptsSectionComponent({
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
    <SettingsSection
      id="quiz-settings-attempts"
      title={t("teacher_quiz_manage.settings.attempts.title")}
    >
      <LockableSection locked={locked}>
        <ToggleRow
          id="quiz-setting-allow-retakes"
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
                id="quiz-setting-max-attempts"
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
              <DurationField
                value={draft.cooldown_hours}
                storageUnit="hours"
                initialUnit="hours"
                onChange={(value) => update("cooldown_hours", value)}
                placeholder={t(
                  "teacher_quiz_manage.settings.attempts.cooldown_placeholder",
                )}
              />
            </Field>
          </div>
        )}
      </LockableSection>
    </SettingsSection>
  );
}

export const SettingsAttemptsSection = memo(
  SettingsAttemptsSectionComponent,
  (previous, next) =>
    previous.update === next.update &&
    previous.locked === next.locked &&
    previous.draft.allow_retakes === next.draft.allow_retakes &&
    previous.draft.max_attempts === next.draft.max_attempts &&
    previous.draft.cooldown_hours === next.draft.cooldown_hours,
);
