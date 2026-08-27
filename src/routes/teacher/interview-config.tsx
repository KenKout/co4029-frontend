import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "@tanstack/react-router";

import {
  useGenerateInterviewQuestions,
  useInterviewGenerationRun,
} from "@/lib/api/hooks/interviews";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import {
  type GenerationFormState,
  type GenerationMode,
  type SettingsDraft,
  type TabId,
} from "@/lib/interview/config-draft";
import {
  ConfigLoadingSkeleton,
  ConfigNotFound,
} from "@/routes/teacher/_components/interview-config/config-page-states";
import { createConfigActions } from "@/routes/teacher/_components/interview-config/config-page-actions";
import type {
  OutcomeFilterId,
  OutcomeFilterSignal,
} from "@/routes/teacher/_components/interview-config/config-panels";
import { ConfigWorkspace } from "@/routes/teacher/_components/interview-config/config-workspace";
import {
  draftFromConfig,
  isDraftDirty,
} from "@/routes/teacher/_components/interview-config/draft-mapping";
import { createTabGuard } from "@/routes/teacher/_components/interview-config/tab-guard";
import { useConfigMutations } from "@/routes/teacher/_components/interview-config/use-config-mutations";
import { useConfigPageData } from "@/routes/teacher/_components/interview-config/use-config-page-data";
import { useNavItems } from "@/routes/teacher/_components/interview-config/use-nav-items";

export default function InterviewConfigPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId, configId } = useParams({ strict: false }) as {
    courseId: string;
    configId: string;
  };

  const qc = useQueryClient();
  const page = useConfigPageData(courseId, configId);
  const config = page.config;

  const mutations = useConfigMutations(configId, courseId);

  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  // Briefly true right after a successful settings save so the header can show
  // a transient "Saved" confirmation (cleared once edits resume or the timer
  // elapses).
  const [justSaved, setJustSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  // Which config section is shown. The page is a tabbed workspace (Settings →
  // Outcomes → Generate → Review → Readiness); all panels stay MOUNTED and
  // inactive ones are hidden, so in-progress edits, generation polling and
  // Question Bank state survive tab switches (no unmount = no data loss).
  const [activeTab, setActiveTab] = useState<TabId>("settings");
  // "View questions" from a Learning Outcome sets this signal; the Question
  // Bank reacts by filtering to that outcome. `nonce` lets the same outcome be
  // re-requested (each click re-triggers the effect even if the id is unchanged).
  const [outcomeFilterSignal, setOutcomeFilterSignal] =
    useState<OutcomeFilterSignal | null>(null);
  function handleViewOutcomeQuestions(outcomeId: OutcomeFilterId) {
    setOutcomeFilterSignal((prev) => ({
      id: outcomeId,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
    // Switch to the Review tab so the filtered questions are visible. Routed
    // through the guard: this link also leaves Settings, so unsaved edits must
    // prompt here exactly as they do for a direct tab click.
    tabs.requestTabChange("questions");
  }
  const [generationForm, setGenerationForm] = useState<GenerationFormState>({
    mode: "outcome-based" as GenerationMode,
    question_count: 5,
    variant_strategy: "",
    focus_topics: "",
    avoid_topics: "",
    source_module_ids: [],
    target_outcome_ids: [],
  });
  const generate = useGenerateInterviewQuestions(configId);

  // Poll the generation run at the page level (not inside the generation
  // form section) so tracking survives navigating away and back. Without
  // this, leaving the page before the run finished left
  // the questions cache permanently stale ("No questions yet" even though
  // the backend had already persisted them).
  const { data: activeRun } = useInterviewGenerationRun(configId, activeRunId);
  useEffect(() => {
    if (activeRun?.status === "completed" || activeRun?.status === "failed") {
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.configAuthoring(configId),
      });
    }
  }, [activeRun?.status, configId, qc]);

  useEffect(() => {
    if (config) setDraft(draftFromConfig(config));
  }, [config]);

  // Whether the settings form has edits not yet persisted. Compares the PATCH
  // payloads (not the raw draft strings) so an edit that normalizes to the
  // stored value — a blank numeric knob cleared to its shipped default, a
  // trailing space on the title — reads as clean: the header never shows
  // Saving…/Unsaved for a change that cannot be persisted, and the tab switch
  // does not raise a dialog whose "Save now" would silently no-op.
  const settingsDirty = useMemo(
    () => Boolean(draft && config && isDraftDirty(draft, config)),
    [draft, config],
  );

  // Remembered target of a tab switch the unsaved-changes guard intercepted.
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);

  // NOTE: `useNavItems` MUST sit above the early returns below (loading / not
  // found) — placing a hook after a conditional return changes the hook call
  // count between renders and triggers React error #310.
  const settingsComplete = Boolean(draft?.title.trim());
  const navItems = useNavItems({
    t,
    settingsComplete,
    outcomeCount: page.outcomeCount,
    draftCount: page.draftCount,
    approvedCount: page.approvedCount,
  });

  if (page.configLoading) return <ConfigLoadingSkeleton />;

  if (!config) return <ConfigNotFound courseId={courseId} />;

  const isPublished = config.status === "published";
  const isArchived = config.status === "archived";
  const publishDisabled =
    mutations.publishConfig.isPending ||
    isPublished ||
    isArchived ||
    page.approvedCount === 0;

  const actions = createConfigActions({
    t,
    draft,
    config,
    courseId,
    generationForm,
    mutations,
    generate,
    isArchived,
    approvedCount: page.approvedCount,
    publishDisabled,
    setJustSaved,
    setActiveRunId,
    setConfirmDelete,
    onDeleted: () =>
      void navigate({ to: "/teacher/courses/$courseId", params: { courseId } }),
  });

  const tabs = createTabGuard({
    activeTab,
    setActiveTab,
    pendingTab,
    setPendingTab,
    settingsDirty,
    saveSettings: actions.saveSettings,
  });

  return (
    <ConfigWorkspace
      config={config}
      configId={configId}
      courseId={courseId}
      page={page}
      navItems={navItems}
      activeTab={activeTab}
      tabs={tabs}
      actions={actions}
      flags={{ isPublished, isArchived, publishDisabled, settingsComplete }}
      pending={{
        publish: mutations.publishConfig.isPending,
        unpublish: mutations.unpublishConfig.isPending,
        archive: mutations.archiveConfig.isPending,
        unarchive: mutations.unarchiveConfig.isPending,
        remove: mutations.deleteConfig.isPending,
      }}
      draft={draft}
      setDraft={setDraft}
      settings={{
        saving: mutations.updateConfig.isPending,
        dirty: settingsDirty,
        justSaved,
      }}
      generation={{
        form: generationForm,
        setForm: setGenerationForm,
        generating: generate.isPending,
        activeRunId,
        run: activeRun,
      }}
      confirmDelete={confirmDelete}
      onConfirmDeleteOpenChange={setConfirmDelete}
      pendingTab={pendingTab}
      onClearPendingTab={() => setPendingTab(null)}
      outcomeFilterSignal={outcomeFilterSignal}
      onViewOutcomeQuestions={handleViewOutcomeQuestions}
    />
  );
}
