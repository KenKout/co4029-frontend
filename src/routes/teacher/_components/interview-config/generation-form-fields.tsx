/**
 * The plain inputs of the Generate tab: role-based question mode, question
 * count, and the focus / avoid topic lists.
 *
 * Split out of `generation-section.tsx` (step 9 of the interview-config
 * decomposition). A generation-`mode` Select ("topic" / "outcome-based" /
 * "coverage") lived here until 2026-08-30; no backend stage ever read the
 * value, so all three choices behaved identically and it was removed rather
 * than left as a decorative dial. Scoping is expressed by the real controls:
 * the module picker, the outcome picker, and focus topics.
 */

import { Trans, useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  GenerationFormState,
  VariantStrategy,
} from "@/lib/interview/config-draft";
import { Field } from "@/routes/teacher/_components/interview-config/form-primitives";

/** Angles per interviewer role — must match the backend's VARIANT_ANGLES
 *  (ai/stages/generation/resolve.py). */
const VARIANT_ANGLES_COUNT = 4;

/** Shared shape for every piece of the generation form. */
export interface GenerationFieldsProps {
  generationForm: GenerationFormState;
  updateGeneration: <K extends keyof GenerationFormState>(
    key: K,
    value: GenerationFormState[K],
  ) => void;
}

export function GenerationModeFields({
  generationForm,
  updateGeneration,
}: GenerationFieldsProps) {
  const { t } = useTranslation();
  const isAllAngles = generationForm.variant_strategy === "all_angles";
  // The backend multiplies the logical count by the angle count in
  // all_angles mode; mirror that here so the note shows the real total.
  const effectiveCount = generationForm.question_count * VARIANT_ANGLES_COUNT;
  return (
    <div className="space-y-4">
      {/* Role-based question mode leads: it decides HOW the bank is shaped,
          so the teacher picks it before sizing the run. */}
      <VariantStrategyFields
        generationForm={generationForm}
        updateGeneration={updateGeneration}
      />
      {/* Count sits alone in a half-width column: the generation-mode Select
          that used to share this row is gone, and a full-width number input
          for a 1-2 digit value reads as a mistake. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label={
            isAllAngles
              ? t(
                  "teacher_interview_config.generate.count_label_per_role",
                )
              : t("teacher_interview_config.generate.count_label")
          }
        >
          <Input
            type="number"
            min={1}
            max={50}
            value={generationForm.question_count}
            onChange={(e) =>
              updateGeneration(
                "question_count",
                Math.floor(Number(e.target.value)) || 0,
              )
            }
          />
          {isAllAngles && effectiveCount > 0 && (
            <p className="text-[11px] text-m3-on-surface-variant">
              {/* i18n string carries <strong>{{effective}}</strong>; Trans
                  renders that markup instead of printing the tag. */}
              <Trans
                i18nKey="teacher_interview_config.generate.variant_expansion_note"
                values={{
                  count: generationForm.question_count,
                  effective: effectiveCount,
                }}
                components={{ strong: <strong className="font-bold text-m3-on-surface" /> }}
              />
            </p>
          )}
        </Field>
      </div>
    </div>
  );
}

/**
 * Role-conditioned variant generation (Slice 21). Empty string = legacy
 * mixed type-mix (the backend default, sent as null). ``all_angles`` asks
 * for one variant of every logical question per interviewer angle — so the
 * bank holds count × angles rows; ``role_only`` pins all questions to this
 * interview's interviewer-role preferred type.
 */
function VariantStrategyFields({
  generationForm,
  updateGeneration,
}: GenerationFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <Field
        label={t("teacher_interview_config.generate.variant_label")}
        hint={t("teacher_interview_config.generate.variant_hint")}
      >
        <Select<VariantStrategy>
          value={generationForm.variant_strategy}
          onValueChange={(next) => updateGeneration("variant_strategy", next)}
          options={[
            {
              value: "",
              label: t(
                "teacher_interview_config.generate.variant_mixed",
              ),
            },
            {
              value: "all_angles",
              label: t("teacher_interview_config.generate.variant_all_angles"),
            },
            {
              value: "role_only",
              label: t("teacher_interview_config.generate.variant_role_only"),
            },
          ]}
        />
      </Field>
    </div>
  );
}

export function GenerationTopicFields({
  generationForm,
  updateGeneration,
}: GenerationFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <Field
        label={t("teacher_interview_config.generate.focus_label")}
        hint={t("teacher_interview_config.generate.focus_hint")}
      >
        <Input
          value={generationForm.focus_topics}
          onChange={(e) => updateGeneration("focus_topics", e.target.value)}
          placeholder={t("teacher_interview_config.generate.focus_placeholder")}
        />
      </Field>

      <Field
        label={t("teacher_interview_config.generate.avoid_label")}
        hint={t("teacher_interview_config.generate.avoid_hint")}
      >
        <Input
          value={generationForm.avoid_topics}
          onChange={(e) => updateGeneration("avoid_topics", e.target.value)}
          placeholder={t("teacher_interview_config.generate.avoid_placeholder")}
        />
      </Field>
    </>
  );
}
