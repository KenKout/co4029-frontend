import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, SettingsSection } from "./form-primitives";
import type { SettingsDraft, SettingsUpdate } from "./types";

/**
 * Timing-enforcement section: what happens to an overdue attempt, plus the
 * grace-period field that only the graceperiod policy reveals. Extracted from
 * SettingsTab verbatim; the caller still supplies the LockableSection wrapper.
 */
export function SettingsTimingSection({
  draft,
  update,
}: {
  draft: SettingsDraft;
  update: SettingsUpdate;
}) {
  const { t } = useTranslation();

  return (
    <SettingsSection
      title={t("teacher_quiz_manage.settings.timing.title")}
      description={t("teacher_quiz_manage.settings.timing.description")}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("teacher_quiz_manage.settings.timing.overdue_label")}
          hint={t("teacher_quiz_manage.settings.timing.overdue_hint")}
        >
          <Select<SettingsDraft["overdue_handling"]>
            value={draft.overdue_handling}
            onValueChange={(next) => update("overdue_handling", next)}
            options={[
              {
                value: "autosubmit",
                label: t(
                  "teacher_quiz_manage.settings.timing.overdue_autosubmit",
                ),
              },
              {
                value: "graceperiod",
                label: t(
                  "teacher_quiz_manage.settings.timing.overdue_graceperiod",
                ),
              },
              {
                value: "autoabandon",
                label: t(
                  "teacher_quiz_manage.settings.timing.overdue_autoabandon",
                ),
              },
            ]}
          />
        </Field>
        {draft.overdue_handling === "graceperiod" && (
          <Field
            label={t("teacher_quiz_manage.settings.timing.grace_label")}
            hint={t("teacher_quiz_manage.settings.timing.grace_hint")}
          >
            <Input
              type="number"
              min={1}
              value={draft.grace_period_seconds}
              onChange={(e) => update("grace_period_seconds", e.target.value)}
              className="w-full"
            />
          </Field>
        )}
      </div>
    </SettingsSection>
  );
}
