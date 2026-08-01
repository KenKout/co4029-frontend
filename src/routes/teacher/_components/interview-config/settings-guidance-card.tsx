/**
 * Card 3 of the Settings tab — Guidance for AI: free-text prose (fed to the
 * question generator) plus the structured scoring rubric (graded against).
 *
 * Split out of `settings-form.tsx` (step 8 of the interview-config
 * decomposition).
 */

import { useTranslation } from "react-i18next";

import { Textarea } from "@/components/ui/textarea";
import { isFieldFrozen } from "@/lib/interview/published-field-freeze";
import { cn } from "@/lib/utils";
import {
  Field,
  SettingsCard,
} from "@/routes/teacher/_components/interview-config/form-primitives";
import { RubricEditor } from "@/routes/teacher/_components/interview-config/rubric-and-guide";
import type { SettingsFieldsetProps } from "@/routes/teacher/_components/interview-config/settings-fieldset";

export function SettingsGuidanceCard({
  draft,
  update,
  lock,
  status,
  frozenReason,
}: SettingsFieldsetProps) {
  const { t } = useTranslation();
  return (
    <SettingsCard
      stagger={2}
      title={t("teacher_interview_config.sections.guidance.title")}
      description={t("teacher_interview_config.sections.guidance.description")}
    >
      <Field
        label={t("teacher_interview_config.fields.notes_label")}
        hint={t("teacher_interview_config.fields.notes_hint")}
        {...lock("supplementary_instructions")}
      >
        <Textarea
          value={draft.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={4}
          placeholder={t(
            "teacher_interview_config.fields.supplementary_placeholder",
          )}
        />
      </Field>

      {/* The rubric is serialized into supplementary_instructions, which the
          evaluator reads — so it freezes with that field, not separately. */}
      <div
        className={cn(
          isFieldFrozen("supplementary_instructions", status) &&
            "pointer-events-none opacity-60",
        )}
        title={
          isFieldFrozen("supplementary_instructions", status)
            ? frozenReason
            : undefined
        }
        aria-disabled={
          isFieldFrozen("supplementary_instructions", status) || undefined
        }
      >
        <RubricEditor
          criteria={draft.rubric_criteria}
          onChange={(next) => update("rubric_criteria", next)}
        />
      </div>
    </SettingsCard>
  );
}
