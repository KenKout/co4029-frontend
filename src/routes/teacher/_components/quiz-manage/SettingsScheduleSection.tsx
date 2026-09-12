import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Field, LockableSection, SettingsSection } from "./form-primitives";
import { SettingsTimingSection } from "./SettingsTimingSection";
import { settingsErrors } from "./settings-insights";
import type { SettingsDraft, SettingsUpdate } from "./types";

/**
 * Schedule section: open / close / due datetimes. Stays editable on a
 * published quiz — extending a deadline or shifting the open/close window
 * doesn't disrupt a live attempt. Extracted from SettingsTab verbatim.
 */
export function SettingsScheduleSection({
  draft,
  update,
  locked = false,
}: {
  draft: SettingsDraft;
  update: SettingsUpdate;
  locked?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <SettingsSection
      title={t("teacher_quiz_manage.settings.schedule.title")}
      description={t("teacher_quiz_manage.settings.schedule.description")}
    >
      <p className="text-xs text-m3-on-surface-variant">{t("teacher_quiz_manage.settings.assist.timezone", { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}</p>
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
            max={draft.available_until || undefined}
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
            aria-invalid={settingsErrors(draft).includes("close_before_open")}
            min={draft.available_from || undefined}
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
      {settingsErrors(draft).includes("close_before_open") && <p role="alert" className="text-sm text-m3-error">{t("teacher_quiz_manage.settings.assist.close_before_open")}</p>}
      <LockableSection locked={locked}>
        <div className="space-y-4">
          <Field label={t("teacher_quiz_manage.settings.scoring.time_label")} hint={t("teacher_quiz_manage.settings.scoring.time_hint")}>
            <Input type="number" min={1 / 60} max={180} step="any" value={draft.time_limit_minutes}
              aria-label={t("teacher_quiz_manage.settings.scoring.time_label")}
              onChange={(e) => update("time_limit_minutes", e.target.value)}
              placeholder={t("teacher_quiz_manage.settings.scoring.time_placeholder")}
              endAdornment={t("teacher_quiz_manage.settings.assist.minute_unit")} />
          </Field>
          <SettingsTimingSection draft={draft} update={update} />
        </div>
      </LockableSection>
    </SettingsSection>
  );
}
