/**
 * The four tab panels of the interview-config workspace, and the `<section>`
 * wrapper that hides the inactive ones.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 7 of that file's
 * decomposition). All four panels stay MOUNTED and inactive ones are hidden, so
 * in-progress edits, generation polling and Question Bank state survive tab
 * switches (no unmount = no data loss) — which is why this is one component
 * rendering all four rather than a switch on `activeTab`.
 */

import type { FormEvent, ReactNode } from "react";

import type {
  InterviewConfigAuthoring,
  InterviewGenerationRunPublic,
  InterviewOutcomeAuthoring,
  InterviewQuestionAuthoring,
} from "@/lib/api/types";
import type {
  GenerationFormState,
  SettingsDraft,
  TabId,
} from "@/lib/interview/config-draft";
import { QuestionBank } from "@/routes/teacher/_components/question-bank";
import { LearningOutcomes } from "@/routes/teacher/_components/learning-outcomes";
import { AdaptiveReadinessPanel } from "@/routes/teacher/_components/adaptive-readiness-panel";
import { GenerationSection } from "@/routes/teacher/_components/interview-config/generation-section";
import { SettingsForm } from "@/routes/teacher/_components/interview-config/settings-form";

/** Which outcome the Question Bank should filter to; "none" = unassigned. */
export type OutcomeFilterId = string | "none";

/**
 * A request to filter the Question Bank to one outcome. `nonce` lets the same
 * outcome be re-requested — each click re-triggers the effect even if the id is
 * unchanged.
 */
export interface OutcomeFilterSignal {
  id: OutcomeFilterId;
  nonce: number;
}

export interface ConfigPanelsProps {
  activeTab: TabId;
  config: InterviewConfigAuthoring;
  configId: string;
  courseId: string;
  draft: SettingsDraft | null;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  questions: InterviewQuestionAuthoring[] | undefined;
  outcomes: InterviewOutcomeAuthoring[] | undefined;
  modules: { id: string; title: string }[] | undefined;
  moduleTitle: string | null;
  savingSettings: boolean;
  settingsDirty: boolean;
  justSaved: boolean;
  practiceQuestionCount: number;
  onSubmitSettings: (event: FormEvent) => void;
  onViewOutcomeQuestions: (outcomeId: OutcomeFilterId) => void;
  generationForm: GenerationFormState;
  setGenerationForm: React.Dispatch<React.SetStateAction<GenerationFormState>>;
  onGenerate: () => void;
  generating: boolean;
  activeRunId: string | null;
  activeRun: InterviewGenerationRunPublic | undefined;
  outcomeFilterSignal: OutcomeFilterSignal | null;
  onGoTo: (id: TabId) => void;
}

export function ConfigPanels({
  activeTab,
  config,
  configId,
  courseId,
  draft,
  setDraft,
  questions,
  outcomes,
  modules,
  moduleTitle,
  savingSettings,
  settingsDirty,
  justSaved,
  practiceQuestionCount,
  onSubmitSettings,
  onViewOutcomeQuestions,
  generationForm,
  setGenerationForm,
  onGenerate,
  generating,
  activeRunId,
  activeRun,
  outcomeFilterSignal,
  onGoTo,
}: ConfigPanelsProps) {
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 space-y-6">
        {draft && (
          <>
            <TabPanel id="settings" activeTab={activeTab} className="space-y-6">
              <SettingsForm
                draft={draft}
                setDraft={setDraft}
                onSubmit={onSubmitSettings}
                saving={savingSettings}
                dirty={settingsDirty}
                justSaved={justSaved}
                updatedAt={config.updated_at ?? null}
                practiceQuestionCount={practiceQuestionCount}
                status={config.status}
                outcomesSlot={
                  <LearningOutcomes
                    configId={configId}
                    courseId={courseId}
                    outcomes={outcomes ?? []}
                    questions={questions ?? []}
                    minOutcomesToPass={config.min_outcomes_to_pass ?? null}
                    onViewQuestions={onViewOutcomeQuestions}
                    status={config.status}
                  />
                }
              />
            </TabPanel>
            <TabPanel id="generate" activeTab={activeTab}>
              <GenerationSection
                generationForm={generationForm}
                setGenerationForm={setGenerationForm}
                onGenerate={onGenerate}
                generating={generating}
                activeRunId={activeRunId}
                run={activeRun}
                modules={modules ?? []}
                ownModuleId={config.module_id}
                outcomes={outcomes ?? []}
              />
            </TabPanel>
            <TabPanel id="questions" activeTab={activeTab}>
              <QuestionBank
                configId={configId}
                courseId={courseId}
                moduleTitle={moduleTitle}
                modules={modules ?? []}
                questions={questions ?? []}
                outcomes={outcomes ?? []}
                outcomeFilterSignal={outcomeFilterSignal}
              />
            </TabPanel>
            <TabPanel id="adaptive-readiness" activeTab={activeTab}>
              <AdaptiveReadinessPanel
                configId={configId}
                questions={questions ?? []}
                outcomes={outcomes ?? []}
                timeLimitMinutes={config.time_limit_minutes ?? null}
                onGoTo={onGoTo}
              />
            </TabPanel>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * One tab panel. Hidden rather than unmounted when inactive, and labelled by the
 * matching `tab-<id>` button rendered by `TabBar`.
 */
function TabPanel({
  id,
  activeTab,
  className,
  children,
}: {
  id: TabId;
  activeTab: TabId;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      hidden={activeTab !== id}
      data-active={activeTab === id}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      className={className}
    >
      {children}
    </section>
  );
}
