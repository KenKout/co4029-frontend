/**
 * The Generate tab: kicks off an AI question-generation run and reports its
 * progress.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 5 of that file's
 * decomposition), then split again into per-field groups plus a progress hook
 * (step 9). The progress helpers moved with the section rather than into lib/,
 * because they exist purely to render this panel's live status — nothing else
 * reads them.
 */

import { useTranslation } from "react-i18next";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  InterviewGenerationRunPublic,
  InterviewOutcomeAuthoring,
} from "@/lib/api/types";
import type { GenerationFormState } from "@/lib/interview/config-draft";
import { Section } from "@/routes/teacher/_components/interview-config/form-primitives";
import {
  GenerationModeFields,
  GenerationTopicFields,
} from "@/routes/teacher/_components/interview-config/generation-form-fields";
import { useGenerationRunState } from "@/routes/teacher/_components/interview-config/generation-progress";
import { GenerationRunStatus } from "@/routes/teacher/_components/interview-config/generation-run-status";
import {
  GenerationModulePicker,
  GenerationOutcomePicker,
} from "@/routes/teacher/_components/interview-config/generation-source-pickers";

export function GenerationSection({
  generationForm,
  setGenerationForm,
  onGenerate,
  generating,
  activeRunId,
  run,
  modules,
  ownModuleId,
  outcomes,
  isPublished,
}: {
  generationForm: GenerationFormState;
  setGenerationForm: React.Dispatch<React.SetStateAction<GenerationFormState>>;
  onGenerate: () => void;
  generating: boolean;
  activeRunId: string | null;
  run: InterviewGenerationRunPublic | undefined;
  modules: { id: string; title: string }[];
  ownModuleId: string;
  outcomes: InterviewOutcomeAuthoring[];
  isPublished: boolean;
}) {
  const { t } = useTranslation();
  function updateGeneration<K extends keyof GenerationFormState>(
    key: K,
    value: GenerationFormState[K],
  ) {
    setGenerationForm((current) => ({ ...current, [key]: value }));
  }

  const runState = useGenerationRunState({ generating, activeRunId, run });
  const inProgress = runState.inProgress;

  return (
    <div className="rounded-xl border-2 border-dashed border-m3-secondary/30 bg-m3-secondary/[0.03] p-6 lg:p-8 space-y-5">
      <Section
        title={t("teacher_interview_config.generate.section_title")}
        description={t("teacher_interview_config.generate.section_description")}
      >
        {isPublished && (
          <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {t("teacher_interview_config.generate.published_locked")}
          </p>
        )}
        <fieldset disabled={isPublished} className="contents">
          <GenerationModeFields
            generationForm={generationForm}
            updateGeneration={updateGeneration}
          />

          <GenerationModulePicker
            generationForm={generationForm}
            updateGeneration={updateGeneration}
            modules={modules}
            ownModuleId={ownModuleId}
          />

          <GenerationOutcomePicker
            generationForm={generationForm}
            updateGeneration={updateGeneration}
            outcomes={outcomes}
          />

          <GenerationTopicFields
            generationForm={generationForm}
            updateGeneration={updateGeneration}
          />

          <p className="text-[11px] text-m3-on-surface-variant">
            {t("teacher_interview_config.generate.reuses_settings_hint")}
          </p>

          {activeRunId && <GenerationRunStatus run={run} state={runState} />}
        </fieldset>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-dashed border-m3-secondary/30">
          <p className="text-[11px] text-m3-on-surface-variant">
            {t("teacher_interview_config.generate.independent_action_hint")}
          </p>
          <Button
            type="button"
            onClick={onGenerate}
            disabled={inProgress || isPublished}
            className="gap-2 gradient-primary text-white border-0 hover:shadow-ai-glow shrink-0"
          >
            {inProgress ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {inProgress
              ? t("teacher_interview_config.generate.processing")
              : t("teacher_interview_config.generate.start_button")}
          </Button>
        </div>
      </Section>
    </div>
  );
}
