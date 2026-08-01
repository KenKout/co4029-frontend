/**
 * Card 2 of the Settings tab — Scoring & timing: the three numeric knobs on one
 * 3-up row, plus the practice-mode toggle beneath them.
 *
 * Split out of `settings-form.tsx` (step 8 of the interview-config
 * decomposition).
 */

import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";

import { Input } from "@/components/ui/input";
import { isFieldFrozen } from "@/lib/interview/published-field-freeze";
import { cn } from "@/lib/utils";
import {
  Field,
  SettingsCard,
} from "@/routes/teacher/_components/interview-config/form-primitives";
import type { SettingsFieldsetProps } from "@/routes/teacher/_components/interview-config/settings-fieldset";

export function SettingsRulesCard({
  draft,
  update,
  lock,
  status,
  frozenReason,
  practiceQuestionCount,
}: SettingsFieldsetProps & {
  /** Approved questions in the practice partition. Zero means enabling practice
      changes nothing, which the form says out loud rather than leaving the
      teacher to find out from a student. */
  practiceQuestionCount: number;
}) {
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

      {/* Practice mode. Full width under the numeric grid because it needs
          two lines of consequence text, not a one-line hint. */}
      <div
        className={cn(
          "mt-4 rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-lowest p-3",
          isFieldFrozen("practice_mode_enabled", status) && "opacity-60",
        )}
        title={
          isFieldFrozen("practice_mode_enabled", status)
            ? frozenReason
            : undefined
        }
      >
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={draft.practice_mode_enabled}
            disabled={isFieldFrozen("practice_mode_enabled", status)}
            onChange={(e) => update("practice_mode_enabled", e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-m3-primary"
          />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-m3-on-surface">
              {t("teacher_interview_config.fields.practice_label")}
            </span>
            <span className="mt-1 block text-xs leading-5 text-m3-on-surface-variant">
              {t("teacher_interview_config.fields.practice_hint")}
            </span>
          </span>
        </label>

        {/* Both consequences of ticking this box, stated rather than
            discovered: it discloses criterion text to students, and it does
            nothing at all until questions are moved into the practice set. */}
        {draft.practice_mode_enabled && (
          <div className="mt-3 space-y-2 border-t border-m3-outline-variant/30 pt-3">
            <p className="text-xs leading-5 text-m3-on-surface-variant">
              {t("teacher_interview_config.fields.practice_rubric_notice")}
            </p>
            {practiceQuestionCount === 0 && (
              <p
                className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-semibold leading-5 text-amber-800"
                role="status"
              >
                <TriangleAlert
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                {t("teacher_interview_config.fields.practice_empty_warning")}
              </p>
            )}
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
