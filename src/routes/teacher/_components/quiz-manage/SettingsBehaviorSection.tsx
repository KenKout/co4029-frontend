import { useTranslation } from "react-i18next";

import { SettingsSection, ToggleRow } from "./form-primitives";
import type { SettingsDraft, SettingsUpdate } from "./types";

/**
 * Behavior section: the four short presentation switches. Extracted from
 * SettingsTab verbatim.
 */
export function SettingsBehaviorSection({
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
    <SettingsSection title={t("teacher_quiz_manage.settings.behavior.title")}>
      {/* One row of four on wide screens — these are short, independent
          switches, so a single column wasted most of the width.

          The first three change how the quiz presents to a student and are
          frozen once published; reminders is a notification setting and
          stays editable. They can't be split across a `<fieldset disabled>`
          here without breaking the grid (the fieldset would be one grid
          item), so the lock is applied per card via `disabled`. */}
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <ToggleRow
          label={t("teacher_quiz_manage.settings.behavior.shuffle_q_label")}
          description={t(
            "teacher_quiz_manage.settings.behavior.shuffle_q_desc",
          )}
          value={draft.shuffle_questions}
          onChange={(v) => update("shuffle_questions", v)}
          disabled={locked}
        />
        <ToggleRow
          label={t("teacher_quiz_manage.settings.behavior.shuffle_o_label")}
          description={t(
            "teacher_quiz_manage.settings.behavior.shuffle_o_desc",
          )}
          value={draft.shuffle_options}
          onChange={(v) => update("shuffle_options", v)}
          disabled={locked}
        />
        <ToggleRow
          label={t("teacher_quiz_manage.settings.behavior.show_hints_label")}
          description={t(
            "teacher_quiz_manage.settings.behavior.show_hints_desc",
          )}
          value={draft.show_hints}
          onChange={(v) => update("show_hints", v)}
          disabled={locked}
        />
        <ToggleRow
          label={t("teacher_quiz_manage.settings.behavior.reminders_label")}
          description={t(
            "teacher_quiz_manage.settings.behavior.reminders_desc",
          )}
          value={draft.reminders_enabled}
          onChange={(v) => update("reminders_enabled", v)}
        />
      </div>
    </SettingsSection>
  );
}
