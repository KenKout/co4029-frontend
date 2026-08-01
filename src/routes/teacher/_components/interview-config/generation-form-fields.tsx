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
