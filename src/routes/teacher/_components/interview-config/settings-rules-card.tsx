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
  activeOutcomeCount = 0,
}: SettingsFieldsetProps) {
  const { t } = useTranslation();
  const noActiveOutcomes = activeOutcomeCount === 0;
  const criteriaHint = noActiveOutcomes
    ? t("teacher_interview_config.fields.criteria_no_outcomes")
    : t("teacher_interview_config.fields.criteria_hint", {
        count: activeOutcomeCount,
      });
  return (
    <SettingsCard
      stagger={1}
      title={t("teacher_interview_config.sections.rules.title")}
    >
      {/* Row 1 — the terms of a sitting: how long one attempt may run, how many
          attempts exist, and how long a student waits between them. All three
          are unbounded-by-default numeric knobs whose empty state means
          something ("unlimited" / "no wait"), so each carries its unit inside
          the field — an anonymous empty box gave no clue whether it wanted
          minutes, hours or a count. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        {/* The retake cooldown (FR-5.3). The backend has always enforced it
            (`services/taking._enforce_retake_policy` → 429, and
            `compute_retake_status` feeds the student's "you can try again
            after …" line), but the input was dropped from this form in
            July 2026, leaving the column NULL on every config and the whole
            gate unreachable. Restored here rather than deleting the gate. */}
        <Field
          label={t("teacher_interview_config.fields.cooldown_label")}
          hint={t("teacher_interview_config.fields.cooldown_hint")}
          {...lock("cooldown_hours")}
        >
          <Input
            type="number"
            min={1}
            value={draft.cooldown_hours}
            onChange={(e) => update("cooldown_hours", e.target.value)}
            placeholder={t(
              "teacher_interview_config.fields.cooldown_placeholder",
            )}
            endAdornment={t("teacher_interview_config.units.hours")}
          />
        </Field>
      </div>
      {/* Row 2 — grading threshold + the per-question budgets the interviewer
          operates under. */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field
          label={t("teacher_interview_config.fields.criteria_label")}
          hint={criteriaHint}
          {...lock("min_outcomes_to_pass")}
        >
          <Input
            type="number"
            min={1}
            max={activeOutcomeCount || undefined}
            disabled={noActiveOutcomes}
            value={draft.min_outcomes_to_pass}
            onChange={(e) => update("min_outcomes_to_pass", e.target.value)}
            placeholder={t(
              "teacher_interview_config.fields.criteria_placeholder",
            )}
            endAdornment={
              noActiveOutcomes
                ? undefined
                : t("teacher_interview_config.fields.criteria_count", {
                    count: activeOutcomeCount,
                  })
            }
          />
        </Field>
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
