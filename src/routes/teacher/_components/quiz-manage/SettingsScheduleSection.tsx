import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Field, SettingsSection } from "./form-primitives";
import type { SettingsDraft, SettingsUpdate } from "./types";

/**
 * Schedule section: open / close / due datetimes. Stays editable on a
 * published quiz — extending a deadline or shifting the open/close window
 * doesn't disrupt a live attempt. Extracted from SettingsTab verbatim.
 */
export function SettingsScheduleSection({
  draft,
  update,
}: {
  draft: SettingsDraft;
  update: SettingsUpdate;
}) {
  const { t } = useTranslation();

  return (
    <SettingsSection
      title={t("teacher_quiz_manage.settings.schedule.title")}
      description={t("teacher_quiz_manage.settings.schedule.description")}
    >
      {/* All three date pickers share one 2-col grid so they line up on a
          common left edge and column width. The inputs are w-full so each
          fills its cell uniformly (previously "due" was a fixed sm:w-72,
          which broke alignment with the open/close fields above it). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label={t("teacher_quiz_manage.settings.schedule.open_label")}
          hint={t("teacher_quiz_manage.settings.schedule.open_hint")}
        >
          <Input
            type="datetime-local"
            value={draft.available_from}
            onChange={(e) => update("available_from", e.target.value)}
            className="w-full"
          />
        </Field>
        <Field
          label={t("teacher_quiz_manage.settings.schedule.close_label")}
          hint={t("teacher_quiz_manage.settings.schedule.close_hint")}
        >
          <Input
            type="datetime-local"
            value={draft.available_until}
            onChange={(e) => update("available_until", e.target.value)}
            className="w-full"
          />
        </Field>
        <Field
          label={t("teacher_quiz_manage.settings.schedule.due_label")}
          hint={t("teacher_quiz_manage.settings.schedule.due_hint")}
        >
          <Input
            type="datetime-local"
            value={draft.due_at}
            onChange={(e) => update("due_at", e.target.value)}
            className="w-full"
          />
        </Field>
      </div>
    </SettingsSection>
  );
}
