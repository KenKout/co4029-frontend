import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  MoreVertical,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  type SectionNavItem,
  type SectionStatus,
} from "@/components/ui/section-nav";
import { QuestionBank } from "@/routes/teacher/_components/question-bank";
import { LearningOutcomes } from "@/routes/teacher/_components/learning-outcomes";
import { AdaptiveReadinessPanel } from "@/routes/teacher/_components/adaptive-readiness-panel";
import {
  useArchiveInterviewConfig,
  useDeleteInterviewConfig,
  useGenerateInterviewQuestions,
  useInterviewForAuthoring,
  useInterviewGenerationRun,
  usePublishInterviewConfig,
  useUnarchiveInterviewConfig,
  useUnpublishInterviewConfig,
  useUpdateInterviewConfig,
} from "@/lib/api/hooks/interviews";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/teacher-courses";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  InterviewConfigAuthoring,
  PersonaProfileRead,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PERSONA_TRAIT_PRESETS,
  type PersonaKey,
} from "@/lib/interview/persona-traits";
import {
  parseSupplementaryInstructions,
  serializeSupplementaryInstructions,
} from "@/lib/interview/supplementary-instructions";
import {
  PERSONA_TRAIT_KEYS,
  integerOrNull,
  type GenerationFormState,
  type GenerationMode,
  type InterviewerRole,
  type Persona,
  type PersonaProfileOverride,
  type SettingsDraft,
  type TabId,
  type TtsVoice,
} from "@/lib/interview/config-draft";
import {
  PublishReadiness,
  TabBar,
} from "@/routes/teacher/_components/interview-config/navigation";
import { GenerationSection } from "@/routes/teacher/_components/interview-config/generation-section";
import { SettingsForm } from "@/routes/teacher/_components/interview-config/settings-form";

function draftFromConfig(config: InterviewConfigAuthoring): SettingsDraft {
  return {
    title: config.title ?? "",
    persona: (config.persona ?? "neutral") as Persona,
    // "" = deployment default voice; only meaningful for English sessions.
    tts_voice: config.tts_voice ?? "",
    // All interviews are hybrid (type-or-voice). The mode selector was removed;
    // any legacy text/voice config is normalized to hybrid on load.
    supported_modes: "hybrid",
    time_limit_minutes:
      config.time_limit_minutes == null
        ? ""
        : String(config.time_limit_minutes),
    max_attempts:
      config.max_attempts == null ? "" : String(config.max_attempts),
    cooldown_hours:
      config.cooldown_hours == null ? "" : String(config.cooldown_hours),
    min_outcomes_to_pass:
      config.min_outcomes_to_pass == null
        ? ""
        : String(config.min_outcomes_to_pass),
    lock_quiz_ef_until_pass: config.lock_quiz_ef_until_pass,
    practice_mode_enabled: config.practice_mode_enabled ?? false,
    ...(() => {
      const parsed = parseSupplementaryInstructions(
        config.supplementary_instructions,
      );
      return { notes: parsed.notes, rubric_criteria: parsed.criteria };
    })(),
    security_response_policy:
      config.security_response_policy ?? "warn_and_continue",
    security_max_consecutive_attempts: String(
      config.security_max_consecutive_attempts ?? 3,
    ),
    security_custom_refusal_en: config.security_custom_refusal_en ?? "",
    security_custom_refusal_vi: config.security_custom_refusal_vi ?? "",
    security_incident_summary_enabled:
      config.security_incident_summary_enabled ?? true,
    // Seed the override panel from whatever the backend resolved. When the
    // config has no stored overrides this equals the preset, so the sliders
    // simply show the preset values; a teacher only creates a real override by
    // moving one away from its preset (see the diff computed on save).
    persona_profile: personaOverrideFromResolved(
      config.persona_profile_resolved,
    ),
  };
}

// Extract just the editable trait dials from the resolved profile. Returns an
// empty object when nothing is resolvable, so the panel falls back to preset
// values via `effectivePersonaTraits`.
function personaOverrideFromResolved(
  resolved: PersonaProfileRead | null | undefined,
): PersonaProfileOverride {
  if (!resolved) return {};
  return {
    warmth: resolved.warmth,
    directness: resolved.directness,
    verbosity: resolved.verbosity,
    formality: resolved.formality,
    ack_frequency: resolved.ack_frequency,
    interviewer_role:
      (resolved as { interviewer_role?: InterviewerRole }).interviewer_role ??
      "generic_assistant",
  };
}

// The effective trait values shown on the sliders: the teacher's override if
// present, else the persona preset. Keeps the panel in sync when the persona
// dropdown changes and no explicit override exists for a trait yet.

// Build the persona_profile payload sent on save: only the traits the teacher
// actually moved AWAY from the preset become an override. When nothing differs,
// return null so the config falls back to the bare preset (no stored override).
function personaOverridePayload(
  persona: Persona,
  override: PersonaProfileOverride,
): PersonaProfileOverride | null {
  const preset =
    PERSONA_TRAIT_PRESETS[persona as PersonaKey] ??
    PERSONA_TRAIT_PRESETS.neutral;
  const presetByKey: Record<(typeof PERSONA_TRAIT_KEYS)[number], number> = {
    warmth: preset.warmth,
    directness: preset.directness,
    verbosity: preset.verbosity,
    formality: preset.formality,
    ack_frequency: preset.ackFrequency,
  };
  const diff: PersonaProfileOverride = {};
  let hasOverride = false;
  for (const key of PERSONA_TRAIT_KEYS) {
    const v = override[key];
    if (typeof v === "number" && v !== presetByKey[key]) {
      diff[key] = v;
      hasOverride = true;
    }
  }
  // Identity has no preset to differ from, so it is carried whenever it is set
  // to something other than the default. Without this the role would be dropped
  // on any config whose tone dials all match the preset.
  if (
    override.interviewer_role &&
    override.interviewer_role !== "generic_assistant"
  ) {
    diff.interviewer_role = override.interviewer_role;
    hasOverride = true;
  }
  return hasOverride ? diff : null;
}

export default function InterviewConfigPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { courseId, configId } = useParams({ strict: false }) as {
    courseId: string;
    configId: string;
  };

  const qc = useQueryClient();
  const { data: course } = useTeacherCourseById(courseId);
  const { data: content } = useTeacherCourseContent(courseId);
  const { data: authoring, isLoading: configLoading } =
    useInterviewForAuthoring(configId);
  const config = authoring?.config;
  const questions = authoring?.questions;
  const outcomes = authoring?.outcomes;

  const courseModule = useMemo(
    () => content?.modules.find((m) => m.id === config?.module_id),
    [content, config?.module_id],
  );

  const draftCount = questions?.length ?? config?.draft_question_count ?? 0;
  const approvedCount = useMemo(
    () =>
      (questions ?? []).filter((q) => q.review_status === "approved").length,
    [questions],
  );
  // Approved questions in the practice partition. Mirrors the server's own
  // gate, so the form can warn before a student hits the 409.
  const practiceQuestionCount = useMemo(
    () =>
      (questions ?? []).filter(
        (q) => q.review_status === "approved" && q.practice_only,
      ).length,
    [questions],
  );

  const updateConfig = useUpdateInterviewConfig(configId);
  const publishConfig = usePublishInterviewConfig(configId);
  const archiveConfig = useArchiveInterviewConfig(configId);
  const unarchiveConfig = useUnarchiveInterviewConfig(configId);
  const unpublishConfig = useUnpublishInterviewConfig(configId);
  const deleteConfig = useDeleteInterviewConfig(configId, courseId);

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
  const [outcomeFilterSignal, setOutcomeFilterSignal] = useState<{
    id: string | "none";
    nonce: number;
  } | null>(null);
  function handleViewOutcomeQuestions(outcomeId: string | "none") {
    setOutcomeFilterSignal((prev) => ({
      id: outcomeId,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
    // Switch to the Review tab so the filtered questions are visible. Routed
    // through the guard: this link also leaves Settings, so unsaved edits must
    // prompt here exactly as they do for a direct tab click.
    requestTabChange("questions");
  }
  const [generationForm, setGenerationForm] = useState<GenerationFormState>({
    mode: "outcome-based" as GenerationMode,
    question_count: 5,
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

  // Whether the settings form has edits not yet persisted. Compares the live
  // draft against the saved config (serialized the same way) so the header can
  // show Saving… / Unsaved changes / Saved and the user never wonders whether
  // they still need to press "Save settings".
  const settingsDirty = useMemo(() => {
    if (!draft || !config) return false;
    const saved = draftFromConfig(config);
    return JSON.stringify(draft) !== JSON.stringify(saved);
  }, [draft, config]);

  // ── Unsaved-changes guard on tab switch ────────────────────────────────────
  // Leaving Settings with unsaved edits is not destructive (panels stay mounted,
  // so the draft survives), but it is easy to forget and then lose the work on a
  // later reload. Intercepting the tab switch asks once: save now, or carry on
  // and save later. The pending tab is remembered so either answer lands the
  // teacher where they were going.
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);

  function requestTabChange(next: TabId) {
    if (next === activeTab) return;
    if (activeTab === "settings" && settingsDirty) {
      setPendingTab(next);
      return;
    }
    setActiveTab(next);
  }

  /** "Later" — keep the unsaved draft and switch anyway. */
  function discardSaveAndSwitch() {
    const next = pendingTab;
    setPendingTab(null);
    if (next) setActiveTab(next);
  }

  /** "Save now" — persist first, and only switch if the save succeeded. */
  async function saveAndSwitch() {
    const next = pendingTab;
    const ok = await saveSettings();
    if (!ok) return; // stay put with the dialog open so the error is actionable
    setPendingTab(null);
    if (next) setActiveTab(next);
  }

  // ── Section-nav status derivation ──────────────────────────────────────────
  // Pure read of existing state — no business logic added. Settings is
  // "completed" once the single required field (title) is present; Learning
  // Outcomes warns while empty; Generate reports how many questions exist;
  // Question Bank reports approved / total.
  //
  // NOTE: this useMemo MUST sit above the early returns below (loading / not
  // found) — placing a hook after a conditional return changes the hook call
  // count between renders and triggers React error #310.
  const outcomeCount = outcomes?.length ?? 0;
  const settingsComplete = Boolean(draft?.title.trim());

  const navItems: SectionNavItem[] = useMemo(() => {
    const settingsStatus: SectionStatus = settingsComplete
      ? {
          kind: "completed",
          label: t("teacher_interview_config.section_nav.status.completed"),
        }
      : {
          kind: "warning",
          label: t(
            "teacher_interview_config.section_nav.status.settings_incomplete",
          ),
        };

    const generateStatus: SectionStatus =
      draftCount > 0
        ? {
            kind: "info",
            label: t(
              "teacher_interview_config.section_nav.status.generated_count",
              {
                count: draftCount,
              },
            ),
          }
        : { kind: "none" };

    const questionsStatus: SectionStatus =
      draftCount > 0
        ? {
            kind: approvedCount === draftCount ? "completed" : "info",
            label: t(
              "teacher_interview_config.section_nav.status.approved_ratio",
              {
                approved: approvedCount,
                total: draftCount,
              },
            ),
          }
        : {
            kind: "warning",
            label: t(
              "teacher_interview_config.section_nav.status.no_questions",
            ),
          };

    return [
      {
        id: "settings",
        label: t("teacher_interview_config.section_nav.settings"),
        shortLabel: t("teacher_interview_config.section_nav.settings_short"),
        status: settingsStatus,
      },
      {
        id: "generate",
        label: t("teacher_interview_config.section_nav.generate"),
        shortLabel: t("teacher_interview_config.section_nav.generate_short"),
        status: generateStatus,
      },
      {
        id: "questions",
        label: t("teacher_interview_config.section_nav.questions"),
        shortLabel: t("teacher_interview_config.section_nav.questions_short"),
        status: questionsStatus,
      },
      {
        id: "adaptive-readiness",
        label: t("teacher_interview_config.section_nav.adaptive_readiness"),
        shortLabel: t(
          "teacher_interview_config.section_nav.adaptive_readiness_short",
        ),
        status: { kind: "none" },
      },
    ];
  }, [t, settingsComplete, outcomeCount, draftCount, approvedCount]);

  if (configLoading) {
    // Shaped like the screen it precedes — header, tab strip, then the first
    // settings card — rather than a bare spinner on an empty page. This guard
    // is also why QuestionBank has no loading state of its own: it never
    // renders while the config query is in flight.
    return (
      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-7 w-72" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="space-y-4">
          {[0, 1, 2].map((card) => (
            <Skeleton
              key={card}
              className="h-40 w-full rounded-xl"
              style={{ animationDelay: `${card * 120}ms` } as CSSProperties}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
            <HelpCircle className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="font-headline font-bold text-m3-on-surface">
            {t("teacher_interview_config.errors.not_found_title")}
          </p>
          <p className="text-sm mt-1">
            {t("teacher_interview_config.errors.not_found_body")}
          </p>
        </div>
        <Link
          to="/teacher/courses/$courseId"
          params={{ courseId }}
          className="inline-flex"
        >
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("teacher_interview_config.errors.back_to_course")}
          </Button>
        </Link>
      </div>
    );
  }

  const isPublished = config.status === "published";
  const isArchived = config.status === "archived";
  const publishDisabled =
    publishConfig.isPending || isPublished || isArchived || approvedCount === 0;

  function returnToCourse() {
    void navigate({
      to: "/teacher/courses/$courseId",
      params: { courseId },
    });
  }

  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    await saveSettings();
  }

  /**
   * Persist the settings draft. Returns true only when the save actually
   * succeeded, so callers that need to act on the result — e.g. the
   * unsaved-changes dialog, which must not navigate away after a failed save —
   * can branch on it. Validation failure and request failure both return false
   * (each already surfaces its own toast).
   */
  async function saveSettings(): Promise<boolean> {
    if (!draft) return false;
    if (!draft.title.trim()) {
      toast.error(t("teacher_interview_config.errors.title_required"));
      return false;
    }
    try {
      await updateConfig.mutateAsync({
        title: draft.title.trim(),
        persona: draft.persona,
        persona_profile: personaOverridePayload(
          draft.persona,
          draft.persona_profile,
        ),
        // Empty selection → null (deployment default voice).
        tts_voice: (draft.tts_voice || null) as TtsVoice | null,
        supported_modes: draft.supported_modes,
        time_limit_minutes: integerOrNull(draft.time_limit_minutes),
        max_attempts: integerOrNull(draft.max_attempts),
        cooldown_hours: integerOrNull(draft.cooldown_hours),
        min_outcomes_to_pass: integerOrNull(draft.min_outcomes_to_pass),
        lock_quiz_ef_until_pass: draft.lock_quiz_ef_until_pass,
        practice_mode_enabled: draft.practice_mode_enabled,
        supplementary_instructions: serializeSupplementaryInstructions({
          notes: draft.notes,
          criteria: draft.rubric_criteria,
        }),
        security_response_policy: draft.security_response_policy,
        security_max_consecutive_attempts:
          integerOrNull(draft.security_max_consecutive_attempts) ?? 3,
        security_custom_refusal_en:
          draft.security_custom_refusal_en.trim() || null,
        security_custom_refusal_vi:
          draft.security_custom_refusal_vi.trim() || null,
        security_incident_summary_enabled:
          draft.security_incident_summary_enabled,
      });
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2500);
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

  async function handlePublish() {
    if (publishDisabled) return;
    try {
      await publishConfig.mutateAsync();
      toast.success(t("teacher_interview_config.toasts.published"));
    } catch (err: unknown) {
      const message = (err as Error).message || "";
      if (isArchived || /archived/i.test(message)) {
        toast.error(
          t("teacher_interview_config.errors.publish_blocked_archived"),
        );
      } else if (/interview_no_outcomes|outcome/i.test(message)) {
        toast.error(t("teacher_interview_config.errors.outcomes_required"));
      } else if (
        approvedCount === 0 ||
        /interview_no_approved_questions|question|insufficient|empty/i.test(
          message,
        )
      ) {
        toast.error(t("teacher_interview_config.errors.questions_required"));
      } else {
        toast.error(
          message || t("teacher_interview_config.toasts.publish_failed"),
        );
      }
    }
  }

  async function handleArchive() {
    try {
      await archiveConfig.mutateAsync();
      toast.success(t("teacher_interview_config.toasts.archived"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.archive_failed"),
      );
    }
  }

  async function handleUnarchive() {
    try {
      await unarchiveConfig.mutateAsync();
      toast.success(t("teacher_interview_config.toasts.unarchived"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.unarchive_failed"),
      );
    }
  }

  async function handleUnpublish() {
    try {
      await unpublishConfig.mutateAsync();
      toast.success(t("teacher_interview_config.toasts.unpublished"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.unpublish_failed"),
      );
    }
  }

  function splitTopics(value: string): string[] {
    return value
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  async function handleGenerate() {
    if (!config) return;
    if (
      !Number.isInteger(generationForm.question_count) ||
      generationForm.question_count < 1
    ) {
      toast.error(t("teacher_interview_config.errors.question_count_min"));
      return;
    }
    try {
      const result = await generate.mutateAsync({
        mode: generationForm.mode,
        course_id: courseId,
        module_id: config.module_id,
        question_count: generationForm.question_count,
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
      });
      setActiveRunId(result.run_id);
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
      await deleteConfig.mutateAsync();
      toast.success(t("teacher_interview_config.toasts.deleted"));
      returnToCourse();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.delete_failed"),
      );
    } finally {
      setConfirmDelete(false);
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1400px] mx-auto">
      <Breadcrumbs
        items={[
          {
            label: t("teacher_common.breadcrumb_teaching"),
            to: "/teacher/courses",
          },
          {
            label: course?.title ?? t("teacher_common.breadcrumb_course"),
            to: "/teacher/courses/$courseId",
            params: { courseId },
          },
          ...(courseModule ? [{ label: courseModule.title }] : []),
          { label: config.title },
        ]}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link to="/teacher/courses/$courseId" params={{ courseId }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 mt-1 shrink-0"
              title={t("teacher_interview_config.actions.back_tooltip")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-gradient-primary leading-tight">
              {config.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-m3-outline-variant/30 bg-m3-surface-container-low text-m3-on-surface-variant rounded-full text-[11px] font-bold px-2.5 py-1">
                {t("teacher_interview_config.header.draft_count", {
                  count: draftCount,
                })}
              </Badge>
              {isPublished ? (
                <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[11px] font-bold gap-1.5 rounded-full px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("teacher_interview_config.status.published")}
                </Badge>
              ) : isArchived ? (
                <Badge className="border-0 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-full px-2.5 py-1">
                  {t("teacher_interview_config.status.archived")}
                </Badge>
              ) : (
                <Badge className="border-0 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full px-2.5 py-1">
                  {t("teacher_interview_config.status.draft")}
                </Badge>
              )}
              <AIInsightChip>
                {t("teacher_interview_config.header.chip_label")}
              </AIInsightChip>
            </div>
            {isPublished && config.published_at && (
              <p className="inline-flex items-center gap-1.5 text-[11px] text-m3-on-surface-variant">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {t("teacher_interview_config.header.last_published", {
                  when: new Date(config.published_at).toLocaleString(
                    i18n.language?.startsWith("vi") ? "vi-VN" : "en-US",
                    { dateStyle: "medium", timeStyle: "short" },
                  ),
                })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            type="button"
            disabled={publishDisabled}
            onClick={handlePublish}
            className={cn(
              "gap-2 border-0 shadow-glass",
              isPublished
                ? "bg-emerald-600 text-white hover:bg-emerald-600 cursor-default"
                : "bg-m3-primary text-white hover:bg-m3-primary/90",
            )}
            title={
              isArchived
                ? t("teacher_interview_config.errors.publish_blocked_archived")
                : approvedCount === 0
                  ? t("teacher_interview_config.errors.questions_required")
                  : isPublished
                    ? t("teacher_interview_config.status.published")
                    : t("teacher_interview_config.actions.publish_label")
            }
          >
            {publishConfig.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPublished ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isPublished
              ? t("teacher_interview_config.status.published")
              : t("teacher_interview_config.actions.publish_short")}
          </Button>
          {isPublished && (
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-700"
              onClick={handleUnpublish}
              disabled={unpublishConfig.isPending}
              title={t("teacher_interview_config.actions.unpublish_label")}
            >
              {unpublishConfig.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 rotate-180" />
              )}
              {t("teacher_interview_config.actions.unpublish_short")}
            </Button>
          )}
          {/* Rare / destructive actions (archive, unarchive, delete) live in
              an overflow menu so they don't compete with the primary Publish
              action. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title={t("teacher_interview_config.actions.more_tooltip")}
                  aria-label={t(
                    "teacher_interview_config.actions.more_tooltip",
                  )}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-44">
              {!isArchived && (
                <DropdownMenuItem
                  onClick={handleArchive}
                  disabled={archiveConfig.isPending}
                  className="gap-2"
                >
                  {archiveConfig.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  {t("teacher_interview_config.actions.archive")}
                </DropdownMenuItem>
              )}
              {isArchived && (
                <DropdownMenuItem
                  onClick={handleUnarchive}
                  disabled={unarchiveConfig.isPending}
                  className="gap-2"
                >
                  {unarchiveConfig.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 rotate-180" />
                  )}
                  {t("teacher_interview_config.actions.unarchive")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={deleteConfig.isPending}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <TabBar
        items={navItems}
        activeTab={activeTab}
        onSelect={requestTabChange}
        ariaLabel={t("teacher_interview_config.section_nav.aria_label")}
      />

      {!isPublished && !isArchived && (
        <PublishReadiness
          settingsComplete={settingsComplete}
          outcomeCount={outcomeCount}
          approvedCount={approvedCount}
          draftCount={draftCount}
          onGoTo={requestTabChange}
        />
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6">
          {draft && (
            <>
              <section
                id="settings"
                hidden={activeTab !== "settings"}
                data-active={activeTab === "settings"}
                role="tabpanel"
                aria-labelledby="tab-settings"
                className="space-y-6"
              >
                <SettingsForm
                  draft={draft}
                  setDraft={setDraft}
                  onSubmit={handleSaveSettings}
                  saving={updateConfig.isPending}
                  dirty={settingsDirty}
                  justSaved={justSaved}
                  updatedAt={config?.updated_at ?? null}
                  practiceQuestionCount={practiceQuestionCount}
                  status={config.status}
                  outcomesSlot={
                    <LearningOutcomes
                      configId={configId}
                      courseId={courseId}
                      outcomes={outcomes ?? []}
                      questions={questions ?? []}
                      minOutcomesToPass={config.min_outcomes_to_pass ?? null}
                      onViewQuestions={handleViewOutcomeQuestions}
                    />
                  }
                />
              </section>
              <section
                id="generate"
                hidden={activeTab !== "generate"}
                data-active={activeTab === "generate"}
                role="tabpanel"
                aria-labelledby="tab-generate"
              >
                <GenerationSection
                  generationForm={generationForm}
                  setGenerationForm={setGenerationForm}
                  onGenerate={handleGenerate}
                  generating={generate.isPending}
                  activeRunId={activeRunId}
                  run={activeRun}
                  modules={content?.modules ?? []}
                  ownModuleId={config.module_id}
                  outcomes={outcomes ?? []}
                />
              </section>
              <section
                id="questions"
                hidden={activeTab !== "questions"}
                data-active={activeTab === "questions"}
                role="tabpanel"
                aria-labelledby="tab-questions"
              >
                <QuestionBank
                  configId={configId}
                  courseId={courseId}
                  moduleTitle={courseModule?.title ?? null}
                  modules={content?.modules ?? []}
                  questions={questions ?? []}
                  outcomes={outcomes ?? []}
                  outcomeFilterSignal={outcomeFilterSignal}
                />
              </section>
              <section
                id="adaptive-readiness"
                hidden={activeTab !== "adaptive-readiness"}
                data-active={activeTab === "adaptive-readiness"}
                role="tabpanel"
                aria-labelledby="tab-adaptive-readiness"
              >
                <AdaptiveReadinessPanel
                  configId={configId}
                  questions={questions ?? []}
                  outcomes={outcomes ?? []}
                  timeLimitMinutes={config.time_limit_minutes ?? null}
                  onGoTo={requestTabChange}
                />
              </section>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("teacher_interview_config.confirm_delete.title")}
        description={t("teacher_interview_config.confirm_delete.body", {
          title: config.title,
        })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleDelete}
        isPending={deleteConfig.isPending}
      />

      {/* Unsaved Settings changes, raised when leaving the Settings tab.
          Non-destructive: "Later" keeps the draft (panels stay mounted) and just
          switches, so the confirm button is `default`, not `destructive`.
          Dismissing (Escape / backdrop) cancels the switch and stays on
          Settings — the safe default when the intent is unclear. */}
      <ConfirmDialog
        open={pendingTab !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTab(null);
        }}
        title={t("teacher_interview_config.confirm_unsaved.title")}
        description={t("teacher_interview_config.confirm_unsaved.body")}
        confirmLabel={t("teacher_interview_config.confirm_unsaved.confirm")}
        cancelLabel={t("teacher_interview_config.confirm_unsaved.cancel")}
        confirmVariant="default"
        onConfirm={saveAndSwitch}
        onCancel={discardSaveAndSwitch}
        isPending={updateConfig.isPending}
        dismissOnBackdrop
      />
    </div>
  );
}
