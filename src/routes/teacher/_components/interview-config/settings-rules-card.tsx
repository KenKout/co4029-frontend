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
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label={t("teacher_interview_config.fields.followups_label")}
          hint={t("teacher_interview_config.fields.followups_hint")}
          {...lock("max_follow_ups_per_question")}
        >
          <Input
            type="number"
            min={0}
            max={50}
            value={draft.max_follow_ups_per_question}
            onChange={(e) =>
              update("max_follow_ups_per_question", e.target.value)
            }
            endAdornment={t("teacher_interview_config.units.turns")}
          />
        </Field>
        <Field
          label={t("teacher_interview_config.fields.hints_label")}
          hint={t("teacher_interview_config.fields.hints_hint")}
          {...lock("max_hints_per_question")}
        >
          <Input
            type="number"
            min={0}
            max={10}
            value={draft.max_hints_per_question}
            onChange={(e) => update("max_hints_per_question", e.target.value)}
            endAdornment={t("teacher_interview_config.units.hints")}
          />
        </Field>
      </div>
    </SettingsCard>
  );
}
