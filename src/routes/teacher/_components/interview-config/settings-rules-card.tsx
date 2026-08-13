/**
 * Card 2 of the Settings tab — Scoring & timing: the three numeric knobs on one
 * 3-up row.
 *
 * Split out of `settings-form.tsx` (step 8 of the interview-config
 * decomposition).
 */

import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import {
  Field,
  SettingsCard,
} from "@/routes/teacher/_components/interview-config/form-primitives";
import type { SettingsFieldsetProps } from "@/routes/teacher/_components/interview-config/settings-fieldset";

export function SettingsRulesCard({
  draft,
  update,
  lock,
}: SettingsFieldsetProps) {
  const { t } = useTranslation();
  return (
    <SettingsCard
      stagger={1}
      title={t("teacher_interview_config.sections.rules.title")}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* All three are unbounded-by-default numeric knobs whose empty state
            means something ("unlimited"), so each carries its unit inside the
            field — an anonymous empty box gave no clue whether it wanted
            minutes, seconds or a count. */}
        <Field
          label={t("teacher_interview_config.fields.duration_label")}
          hint={t("teacher_interview_config.fields.duration_hint")}
          {...lock("time_limit_minutes")}
        >
          <Input
            type="number"
            min={1}
            max={180}
            value={draft.time_limit_minutes}
            onChange={(e) => update("time_limit_minutes", e.target.value)}
            placeholder={t(
              "teacher_interview_config.fields.duration_placeholder",
            )}
            endAdornment={t("teacher_interview_config.units.minutes")}
          />
        </Field>
        <Field
          label={t("teacher_interview_config.fields.attempts_label")}
          hint={t("teacher_interview_config.fields.duration_hint")}
          {...lock("max_attempts")}
        >
          <Input
            type="number"
            min={1}
            value={draft.max_attempts}
            onChange={(e) => update("max_attempts", e.target.value)}
            placeholder={t(
              "teacher_interview_config.fields.attempts_placeholder",
            )}
            endAdornment={t("teacher_interview_config.units.attempts")}
          />
        </Field>
        <Field
          label={t("teacher_interview_config.fields.criteria_label")}
          hint={t("teacher_interview_config.fields.criteria_hint")}
          {...lock("min_outcomes_to_pass")}
        >
          <Input
            type="number"
            min={1}
            value={draft.min_outcomes_to_pass}
            onChange={(e) => update("min_outcomes_to_pass", e.target.value)}
            placeholder={t(
              "teacher_interview_config.fields.criteria_placeholder",
            )}
            endAdornment={t("teacher_interview_config.units.outcomes")}
          />
        </Field>
      </div>
    </SettingsCard>
  );
}
