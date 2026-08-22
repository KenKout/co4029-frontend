/**
 * The plain inputs of the Generate tab: generation mode, question count, and the
 * focus / avoid topic lists.
 *
 * Split out of `generation-section.tsx` (step 9 of the interview-config
 * decomposition).
 */

import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  GenerationFormState,
  GenerationMode,
  VariantStrategy,
} from "@/lib/interview/config-draft";
import { Field } from "@/routes/teacher/_components/interview-config/form-primitives";

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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label={t("teacher_interview_config.generate.mode_label")}>
        <Select<GenerationMode>
          value={generationForm.mode}
          onValueChange={(next) => updateGeneration("mode", next)}
          options={[
            {
              value: "outcome-based",
              label: t("teacher_interview_config.generate.mode_outcome"),
            },
            {
              value: "topic",
              label: t("teacher_interview_config.generate.mode_topic"),
            },
            {
              value: "coverage",
              label: t("teacher_interview_config.generate.mode_coverage"),
            },
          ]}
        />
      </Field>
      <Field label={t("teacher_interview_config.generate.count_label")}>
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
      </Field>
      <div className="sm:col-span-2">
        <VariantStrategyFields
          generationForm={generationForm}
          updateGeneration={updateGeneration}
        />
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
  const isAllAngles = generationForm.variant_strategy === "all_angles";
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
      {isAllAngles && (
        <p className="text-[11px] text-m3-on-surface-variant">
          {t("teacher_interview_config.generate.variant_all_angles_note")}
        </p>
      )}
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
