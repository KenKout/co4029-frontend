/**
 * The write side of the interview-config page: saving settings, the four status
 * transitions, starting a generation run, and deleting the config.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 7 of that file's
 * decomposition). A plain factory rather than a hook, deliberately: the page
 * builds these AFTER its loading / not-found early returns, where `config` is
 * known to exist, and a hook there would break React's hook-count invariant.
 * Every closure is recreated per render exactly as the inline `function`
 * declarations it replaces were.
 */

import type { FormEvent } from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { InterviewConfigAuthoring, InterviewGenerationRequest } from "@/lib/api/types";
import type {
  GenerationFormState,
  SettingsDraft,
} from "@/lib/interview/config-draft";
import { serializeSupplementaryInstructions } from "@/lib/interview/supplementary-instructions";
import type { useGenerateInterviewQuestions } from "@/lib/api/hooks/interviews";
import {
  publishFailureMessage,
  runConfigAction,
  splitTopics,
} from "@/routes/teacher/_components/interview-config/config-actions";
import {
  buildConfigUpdatePayload,
  draftFromConfig,
} from "@/routes/teacher/_components/interview-config/draft-mapping";
import type { useConfigMutations } from "@/routes/teacher/_components/interview-config/use-config-mutations";

export interface ConfigActionsDeps {
  t: TFunction;
  draft: SettingsDraft | null;
  config: InterviewConfigAuthoring;
  courseId: string;
  generationForm: GenerationFormState;
  settingsDirty?: boolean;
  mutations: ReturnType<typeof useConfigMutations>;
  generate: ReturnType<typeof useGenerateInterviewQuestions>;
  isArchived: boolean;
  approvedCount: number;
  publishDisabled: boolean;
  setJustSaved: (value: boolean) => void;
  setDraft: (value: SettingsDraft) => void;
  setActiveRunId: (value: string | null) => void;
  setConfirmDelete: (value: boolean) => void;
  /** Navigate back to the owning course once the config is gone. */
  onDeleted: () => void;
}

export interface ConfigActions {
  saveSettings: () => Promise<boolean>;
  handleSaveSettings: (event: FormEvent) => Promise<void>;
  handlePublish: () => Promise<void>;
  handleArchive: () => Promise<void>;
  handleUnarchive: () => Promise<void>;
  handleUnpublish: () => Promise<void>;
  handleGenerate: () => Promise<void>;
  handleDelete: () => Promise<void>;
}

function buildGenerateRequest(
  deps: ConfigActionsDeps,
): InterviewGenerationRequest {
  const { config, draft, generationForm } = deps;
  return {
    course_id: deps.courseId,
    module_id: config.module_id,
    question_count: generationForm.question_count,
    // "" = the teacher did not pick a variant mode → null keeps the
    // backend on the legacy mixed type-mix.
    variant_strategy:
      generationForm.variant_strategy === ""
        ? null
        : generationForm.variant_strategy,
    focus_topics: splitTopics(generationForm.focus_topics),
    avoid_topics: splitTopics(generationForm.avoid_topics),
    source_module_ids: generationForm.source_module_ids,
    source_lesson_ids: [],
    target_outcome_ids: generationForm.target_outcome_ids,
    persona: draft?.persona,
    // Send the same serialized blob the config stores; the backend strips
    // the structured keys and feeds only the prose to the generation prompt.
    supplementary_instructions: draft
      ? serializeSupplementaryInstructions({
          notes: draft.notes,
          criteria: draft.rubric_criteria,
        })
      : null,
  };
}

export function createConfigActions(deps: ConfigActionsDeps): ConfigActions {
  const { t, mutations } = deps;

  /**
   * Persist the settings draft. Returns true only when the save actually
   * succeeded, so callers that need to act on the result — e.g. the
   * unsaved-changes dialog, which must not navigate away after a failed save —
   * can branch on it. Validation failure and request failure both return false
   * (each already surfaces its own toast).
   */
  async function saveSettings(): Promise<boolean> {
    const { draft } = deps;
    if (!draft) return false;
    if (!draft.title.trim()) {
      toast.error(t("teacher_interview_config.errors.title_required"));
      return false;
    }
    try {
      // Diff against the saved config so a published interview accepts a
      // title-only edit: the backend freeze treats every sent field as
      // "changed", so echoing the whole form back would 409 on the frozen
      // settings even though none of them moved.
      const baseline = draftFromConfig(deps.config);
      const payload = buildConfigUpdatePayload(draft, baseline);
      // A dirty draft can normalize to an EMPTY PATCH: the title trimmed to
      // its stored value, or a numeric knob cleared while it already holds
      // its shipped default ("", "" and "3" all map to 3 on the wire). A
      // PATCH {} returns 200 and persists nothing, so reporting success here
      // would fake a save (the dialog closes, the field snaps back). Surface
      // it instead and keep the caller from claiming victory.
      if (Object.keys(payload).length === 0) {
        toast.error(t("teacher_interview_config.errors.nothing_to_save"));
        return false;
      }
      const savedConfig = await mutations.updateConfig.mutateAsync(payload);
      // Rebase the controlled form from the server response in the same save
      // operation. Waiting for the invalidated authoring query to refetch can
      // leave the footer comparing against stale state and showing "Unsaved
      // changes" beside a successful toast.
      deps.setDraft(draftFromConfig(savedConfig));
      deps.setJustSaved(true);
      window.setTimeout(() => deps.setJustSaved(false), 2500);
      toast.success(t("teacher_interview_config.toasts.config_saved"));
      return true;
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.save_failed"),
      );
      return false;
    }
  }

  async function handleSaveSettings(event: FormEvent) {
    event.preventDefault();
    await saveSettings();
  }

  async function handlePublish() {
    if (deps.publishDisabled) return;
    try {
      await mutations.publishConfig.mutateAsync();
      toast.success(t("teacher_interview_config.toasts.published"));
    } catch (err: unknown) {
      toast.error(
        publishFailureMessage({
          message: (err as Error).message || "",
          isArchived: deps.isArchived,
          approvedCount: deps.approvedCount,
          messages: {
            archived: t(
              "teacher_interview_config.errors.publish_blocked_archived",
            ),
            outcomesRequired: t(
              "teacher_interview_config.errors.outcomes_required",
            ),
            questionsRequired: t(
              "teacher_interview_config.errors.questions_required",
            ),
            fallback: t("teacher_interview_config.toasts.publish_failed"),
          },
        }),
      );
    }
  }

  async function handleArchive() {
    await runConfigAction({
      mutateAsync: () => mutations.archiveConfig.mutateAsync(),
      successMessage: t("teacher_interview_config.toasts.archived"),
      failureMessage: t("teacher_interview_config.toasts.archive_failed"),
    });
  }

  async function handleUnarchive() {
    await runConfigAction({
      mutateAsync: () => mutations.unarchiveConfig.mutateAsync(),
      successMessage: t("teacher_interview_config.toasts.unarchived"),
      failureMessage: t("teacher_interview_config.toasts.unarchive_failed"),
    });
  }

  async function handleUnpublish() {
    await runConfigAction({
      mutateAsync: () => mutations.unpublishConfig.mutateAsync(),
      successMessage: t("teacher_interview_config.toasts.unpublished"),
      failureMessage: t("teacher_interview_config.toasts.unpublish_failed"),
    });
  }

  async function handleGenerate() {
    if (deps.settingsDirty) {
      toast.error(t("teacher_interview_config.generate.save_settings_first"));
      return;
    }
    const { config, generationForm } = deps;
    if (config.status === "published") {
      toast.error(t("teacher_interview_config.generate.published_locked"));
      return;
    }
    if (
      !Number.isInteger(generationForm.question_count) ||
      generationForm.question_count < 1
    ) {
      toast.error(t("teacher_interview_config.errors.question_count_min"));
      return;
    }
    try {
      const result = await deps.generate.mutateAsync(buildGenerateRequest(deps));
      deps.setActiveRunId(result.run_id);
      toast.success(t("teacher_interview_config.toasts.generation_started"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.generation_failed"),
      );
    }
  }

  async function handleDelete() {
    try {
      await mutations.deleteConfig.mutateAsync();
      toast.success(t("teacher_interview_config.toasts.deleted"));
      deps.onDeleted();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.delete_failed"),
      );
    } finally {
      deps.setConfirmDelete(false);
    }
  }

  return {
    saveSettings,
    handleSaveSettings,
    handlePublish,
    handleArchive,
    handleUnarchive,
    handleUnpublish,
    handleGenerate,
    handleDelete,
  };
}
