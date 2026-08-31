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
import type {
  GenerationFormState,
  InterviewerRole,
} from "@/lib/interview/config-draft";
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
  interviewerRole,
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
  /** The config's SAVED interviewer role — decides whether role_only is usable. */
  interviewerRole: InterviewerRole;
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
    <section className="overflow-hidden rounded-2xl border border-m3-outline-variant/35 bg-m3-surface-container-low/45 shadow-sm">
      <div className="border-b border-m3-outline-variant/25 bg-m3-surface-container-lowest/50 px-5 py-5 sm:px-6">
        <Section
          title={t("teacher_interview_config.generate.section_title")}
          description={t("teacher_interview_config.generate.section_description")}
        >
          {isPublished && (
            <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {t("teacher_interview_config.generate.published_locked")}
            </p>
          )}
        </Section>
      </div>

      <fieldset disabled={isPublished} className="space-y-5 p-5 sm:p-6">
        <div className="grid items-start gap-5 xl:grid-cols-12">
          <div className="rounded-xl border border-m3-outline-variant/25 bg-m3-surface-container-lowest/55 p-4 xl:col-span-5">
            <GenerationModeFields
              generationForm={generationForm}
              updateGeneration={updateGeneration}
              interviewerRole={interviewerRole}
            />
          </div>

          <div className="xl:col-span-7">
            <GenerationModulePicker
              generationForm={generationForm}
              updateGeneration={updateGeneration}
              modules={modules}
              ownModuleId={ownModuleId}
            />
          </div>
        </div>

        <div className="rounded-xl border border-m3-outline-variant/25 bg-m3-surface-container-lowest/55 p-4">
          <GenerationOutcomePicker
            generationForm={generationForm}
            updateGeneration={updateGeneration}
            outcomes={outcomes}
          />
        </div>

        <div className="grid gap-4 border-t border-m3-outline-variant/20 pt-5 sm:grid-cols-2">
          <GenerationTopicFields
            generationForm={generationForm}
            updateGeneration={updateGeneration}
          />
        </div>

        <p className="text-[11px] leading-4 text-m3-on-surface-variant">
          {t("teacher_interview_config.generate.reuses_settings_hint")}
        </p>
      </fieldset>

      <div className="space-y-4 border-t border-m3-outline-variant/25 bg-m3-surface-container-low/35 p-5 sm:p-6">
        {activeRunId && <GenerationRunStatus run={run} state={runState} />}
        <div className="flex flex-col gap-3 rounded-xl border border-m3-secondary/20 bg-m3-secondary/[0.045] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-[11px] leading-4 text-m3-on-surface-variant">
            {t("teacher_interview_config.generate.independent_action_hint")}
          </p>
          <Button
            type="button"
            onClick={onGenerate}
            disabled={inProgress || isPublished}
            className="w-full shrink-0 gap-2 border-0 text-white gradient-primary hover:shadow-ai-glow sm:w-auto"
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
      </div>
    </section>
  );
}
