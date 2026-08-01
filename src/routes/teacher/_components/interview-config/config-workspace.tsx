/**
 * The rendered tree of the interview-config page once its config has loaded:
 * header, tab bar, publish-readiness strip, the four tab panels, and the two
 * confirmation dialogs.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 7 of that file's
 * decomposition). The page keeps every hook — data, state, dirty tracking and
 * the unsaved-changes guard — and hands the resolved values here, so this file
 * holds composition and nothing else.
 */

import { useTranslation } from "react-i18next";

import type { SectionNavItem } from "@/components/ui/section-nav";
import type {
  InterviewConfigAuthoring,
  InterviewGenerationRunPublic,
} from "@/lib/api/types";
import type {
  GenerationFormState,
  SettingsDraft,
  TabId,
} from "@/lib/interview/config-draft";
import {
  PublishReadiness,
  TabBar,
} from "@/routes/teacher/_components/interview-config/navigation";
import { ConfigDialogs } from "@/routes/teacher/_components/interview-config/config-dialogs";
import { ConfigHeader } from "@/routes/teacher/_components/interview-config/config-header";
import { ConfigPanels } from "@/routes/teacher/_components/interview-config/config-panels";
import type {
  OutcomeFilterId,
  OutcomeFilterSignal,
} from "@/routes/teacher/_components/interview-config/config-panels";
import type { ConfigActionPending } from "@/routes/teacher/_components/interview-config/config-header-actions";
import type { ConfigActions } from "@/routes/teacher/_components/interview-config/config-page-actions";
import type { TabGuard } from "@/routes/teacher/_components/interview-config/tab-guard";
import type { useConfigPageData } from "@/routes/teacher/_components/interview-config/use-config-page-data";

/** The counts and titles `useConfigPageData` derives from the page's queries. */
type ConfigPageData = ReturnType<typeof useConfigPageData>;

/** Derived status of the config, read by the header, strip and readiness list. */
export interface ConfigStatusFlags {
  isPublished: boolean;
  isArchived: boolean;
  publishDisabled: boolean;
  settingsComplete: boolean;
}

/** Save state of the settings form, owned by the page. */
export interface ConfigSettingsState {
  saving: boolean;
  dirty: boolean;
  justSaved: boolean;
}

/** Live state of the generation form and its run, owned by the page. */
export interface ConfigGenerationState {
  form: GenerationFormState;
  setForm: React.Dispatch<React.SetStateAction<GenerationFormState>>;
  generating: boolean;
  activeRunId: string | null;
  run: InterviewGenerationRunPublic | undefined;
}

export interface ConfigWorkspaceProps {
  config: InterviewConfigAuthoring;
  configId: string;
  courseId: string;
  page: ConfigPageData;
  navItems: SectionNavItem[];
  activeTab: TabId;
  tabs: TabGuard;
  actions: ConfigActions;
  flags: ConfigStatusFlags;
  pending: ConfigActionPending;
  draft: SettingsDraft | null;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  settings: ConfigSettingsState;
  generation: ConfigGenerationState;
  confirmDelete: boolean;
  onConfirmDeleteOpenChange: (open: boolean) => void;
  pendingTab: TabId | null;
  onClearPendingTab: () => void;
  outcomeFilterSignal: OutcomeFilterSignal | null;
  onViewOutcomeQuestions: (outcomeId: OutcomeFilterId) => void;
}

export function ConfigWorkspace({
  config,
  configId,
  courseId,
  page,
  navItems,
  activeTab,
  tabs,
  actions,
  flags,
  pending,
  draft,
  setDraft,
  settings,
  generation,
  confirmDelete,
  onConfirmDeleteOpenChange,
  pendingTab,
  onClearPendingTab,
  outcomeFilterSignal,
  onViewOutcomeQuestions,
}: ConfigWorkspaceProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 pb-12 max-w-[1400px] mx-auto">
      <ConfigHeader
        courseId={courseId}
        courseTitle={page.courseTitle}
        moduleTitle={page.moduleTitle}
        title={config.title}
        publishedAt={config.published_at}
        draftCount={page.draftCount}
        approvedCount={page.approvedCount}
        isPublished={flags.isPublished}
        isArchived={flags.isArchived}
        publishDisabled={flags.publishDisabled}
        pending={pending}
        handlers={{
          onPublish: actions.handlePublish,
          onUnpublish: actions.handleUnpublish,
          onArchive: actions.handleArchive,
          onUnarchive: actions.handleUnarchive,
          onRequestDelete: () => onConfirmDeleteOpenChange(true),
        }}
      />

      <TabBar
        items={navItems}
        activeTab={activeTab}
        onSelect={tabs.requestTabChange}
        ariaLabel={t("teacher_interview_config.section_nav.aria_label")}
      />

      {!flags.isPublished && !flags.isArchived && (
        <PublishReadiness
          settingsComplete={flags.settingsComplete}
          outcomeCount={page.outcomeCount}
          approvedCount={page.approvedCount}
          draftCount={page.draftCount}
          onGoTo={tabs.requestTabChange}
        />
      )}

      <ConfigPanels
        activeTab={activeTab}
        config={config}
        configId={configId}
        courseId={courseId}
        draft={draft}
        setDraft={setDraft}
        questions={page.questions}
        outcomes={page.outcomes}
        modules={page.modules}
        moduleTitle={page.moduleTitle}
        savingSettings={settings.saving}
        settingsDirty={settings.dirty}
        justSaved={settings.justSaved}
        practiceQuestionCount={page.practiceQuestionCount}
        onSubmitSettings={actions.handleSaveSettings}
        onViewOutcomeQuestions={onViewOutcomeQuestions}
        generationForm={generation.form}
        setGenerationForm={generation.setForm}
        onGenerate={actions.handleGenerate}
        generating={generation.generating}
        activeRunId={generation.activeRunId}
        activeRun={generation.run}
        outcomeFilterSignal={outcomeFilterSignal}
        onGoTo={tabs.requestTabChange}
      />

      <ConfigDialogs
        confirmDelete={confirmDelete}
        onConfirmDeleteOpenChange={onConfirmDeleteOpenChange}
        configTitle={config.title}
        deletePending={pending.remove}
        onConfirmDelete={actions.handleDelete}
        pendingTab={pendingTab}
        onClearPendingTab={onClearPendingTab}
        savePending={settings.saving}
        onSaveAndSwitch={tabs.saveAndSwitch}
        onDiscardAndSwitch={tabs.discardSaveAndSwitch}
      />
    </div>
  );
}
