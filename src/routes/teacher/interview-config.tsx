import type { CSSProperties, ReactElement } from "react";
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  Archive,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  HelpCircle,
  Loader2,
  Lock,
  MoreVertical,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  InterviewGenerationRunPublic,
  InterviewOutcomeAuthoring,
  PersonaProfileRead,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  hasFrozenFields,
  isFieldFrozen,
} from "@/lib/interview/published-field-freeze";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PERSONA_TRAIT_PRESETS,
  type PersonaKey,
} from "@/lib/interview/persona-traits";
import {
  type RubricCriterion,
  MAX_CRITERIA,
  MAX_CRITERION_NAME_CHARS,
  parseSupplementaryInstructions,
  serializeSupplementaryInstructions,
} from "@/lib/interview/supplementary-instructions";
import {
  INTERVIEWER_ROLE_KEYS,
  PERSONA_KEYS,
  PERSONA_TRAIT_KEYS,
  integerOrNull,
  type GenerationMode,
  type InterviewerRole,
  type Persona,
  type PersonaProfileOverride,
  type SecurityResponsePolicy,
  type SettingsDraft,
  type TabId,
  type TtsVoice,
} from "@/lib/interview/config-draft";

interface GenerationFormState {
  mode: GenerationMode;
  question_count: number;
  focus_topics: string;
  avoid_topics: string;
  // Modules the generation should draw from. Empty = the interview's own
  // module (backend default). Multi-select lets a teacher scope one interview
  // across several modules.
  source_module_ids: string[];
  // Interview rubric-outcome ids to target. Empty = every outcome (backend
  // default). Lets a teacher focus a run on specific learning outcomes.
  target_outcome_ids: string[];
}

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
function effectivePersonaTraits(
  persona: Persona,
  override: PersonaProfileOverride,
): Record<(typeof PERSONA_TRAIT_KEYS)[number], number> {
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
  const out = { ...presetByKey };
  for (const key of PERSONA_TRAIT_KEYS) {
    const v = override[key];
    if (typeof v === "number") out[key] = v;
  }
  return out;
}

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
// Deepgram Aura-2 English voices. MUST stay in sync with the backend allow-list
// (services.narration.ALLOWED_TTS_VOICES / schemas.authoring.TtsVoiceLiteral).
// Empty value ("") = deployment default (settings.deepgram_tts_model_en).
// English-only: Vietnamese sessions have no server TTS, so this is ignored there.
const VOICE_KEYS: TtsVoice[] = [
  "aura-2-thalia-en",
  "aura-2-andromeda-en",
  "aura-2-helena-en",
  "aura-2-apollo-en",
  "aura-2-arcas-en",
  "aura-2-aries-en",
  "aura-2-asteria-en",
  "aura-2-athena-en",
  "aura-2-hera-en",
  "aura-2-hyperion-en",
  "aura-2-luna-en",
  "aura-2-orion-en",
  "aura-2-orpheus-en",
  "aura-2-ophelia-en",
  "aura-2-zeus-en",
  "aura-2-vesta-en",
];

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

interface GenerationProgress {
  phase: "generating" | "saving" | "completed";
  accepted: number;
  target: number;
  percent: number;
}

/**
 * Reads live generation progress the pipeline writes into
 * `config_json.progress` ({ phase, accepted, target }) each backfill round.
 * Once the run completes, falls back to the pipeline summary's
 * `questions_persisted` / `question_count_requested` so the bar lands on 100%.
 */
function readGenerationProgress(
  run: InterviewGenerationRunPublic | undefined,
): GenerationProgress | null {
  const cfg = run?.config_json as Record<string, unknown> | undefined;
  if (!cfg) return null;

  const toInt = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.max(0, Math.floor(v))
      : null;

  // Completed summary takes precedence so the bar always finishes at target.
  const pipeline = cfg.pipeline as Record<string, unknown> | undefined;
  const gen = pipeline?.generation as Record<string, unknown> | undefined;
  if (gen) {
    const target = toInt(gen.question_count_requested);
    const accepted = toInt(gen.questions_persisted);
    if (target !== null && accepted !== null) {
      return {
        phase: "completed",
        accepted,
        target,
        percent:
          target > 0
            ? Math.round((Math.min(accepted, target) / target) * 100)
            : 100,
      };
    }
  }

  const live = cfg.progress as Record<string, unknown> | undefined;
  if (live) {
    const target = toInt(live.target);
    const accepted = toInt(live.accepted);
    const phaseRaw = live.phase;
    const phase =
      phaseRaw === "saving" || phaseRaw === "completed"
        ? phaseRaw
        : "generating";
    if (target !== null && accepted !== null) {
      return {
        phase,
        accepted,
        target,
        percent:
          target > 0
            ? Math.round((Math.min(accepted, target) / target) * 100)
            : 0,
      };
    }
  }

  return null;
}

// Tabbed navigation for the interview-config workspace. Replaces the old
// scroll-spy SectionNav: clicking a tab swaps which panel is shown (panels
// stay mounted, hidden via `hidden`, so state/edits survive). Reuses the
// SectionNavItem status model to render a small per-tab status affix.
export function TabBar({
  items,
  activeTab,
  onSelect,
  ariaLabel,
}: {
  items: SectionNavItem[];
  activeTab: TabId;
  onSelect: (id: TabId) => void;
  ariaLabel: string;
}) {
  function statusDot(status: SectionNavItem["status"]) {
    const kind = status?.kind ?? "none";
    if (kind === "completed")
      return (
        <span
          className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          aria-hidden="true"
        />
      );
    if (kind === "warning")
      return (
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber-500"
          aria-hidden="true"
        />
      );
    if (kind === "info")
      return (
        <span
          className="h-1.5 w-1.5 rounded-full bg-m3-secondary"
          aria-hidden="true"
        />
      );
    return null;
  }

  // Sliding colored indicator: an absolutely-positioned pill that measures the
  // active tab's offset/width and animates to it via CSS transform, so the
  // color glides between sections instead of snapping. Recomputed on tab
  // change, container resize, and font/label (language) changes.
  const listRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
    ready: boolean;
  }>({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    function measure() {
      const el = tabRefs.current.get(activeTab);
      const list = listRef.current;
      if (!el || !list) return;
      setIndicator({
        left: el.offsetLeft,
        width: el.offsetWidth,
        ready: true,
      });
    }
    measure();
    const list = listRef.current;
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    if (ro && list) {
      ro.observe(list);
      for (const el of tabRefs.current.values()) ro.observe(el);
    }
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeTab, items]);

  return (
    <nav
      aria-label={ariaLabel}
      className="sticky z-10 -mx-1 px-1"
      style={{ top: 64 }}
    >
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        className="relative flex items-stretch gap-1 overflow-x-auto no-scrollbar rounded-lg border border-border bg-white/95 p-1 shadow-sm backdrop-blur-sm lg:overflow-visible"
      >
        {/* The sliding pill — sits behind the tab labels and glides to the
            active tab. Hidden until first measured to avoid a flash at 0,0. */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1 bottom-1 rounded-md bg-m3-primary shadow-sm ring-1 ring-m3-primary",
            "motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out",
            indicator.ready ? "opacity-100" : "opacity-0",
          )}
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
          }}
        />
        {items.map((item) => {
          const isActive = item.id === activeTab;
          const status = item.status ?? { kind: "none" as const };
          return (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              ref={(el) => {
                if (el) tabRefs.current.set(item.id, el);
                else tabRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={item.id}
              onClick={() => onSelect(item.id as TabId)}
              className={cn(
                "group relative z-10 min-w-fit flex-1 rounded-md px-3 py-2 text-center transition-colors duration-300",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                "whitespace-nowrap cursor-pointer",
                // Text color switches with the sliding pill; the pill itself
                // provides the colored background.
                isActive
                  ? "text-white"
                  : "text-m3-on-surface hover:bg-surface-muted",
              )}
            >
              {/* Two stacked rows: the tab name (with its status dot) on top,
                  and the sub-status affix (e.g. "Completed" / "None yet")
                  centered on a SECOND line beneath it so the name stays the
                  visual anchor and the status reads as a caption. */}
              <span className="flex flex-col items-center justify-center gap-0.5">
                <span className="flex items-center justify-center gap-2">
                  {statusDot(status)}
                  <span className="text-[13px] font-bold">
                    <span className="lg:hidden xl:inline">{item.label}</span>
                    <span className="hidden lg:inline xl:hidden">
                      {item.shortLabel ?? item.label}
                    </span>
                  </span>
                </span>
                {status.kind !== "none" && (
                  <span
                    className={cn(
                      "text-[11px] leading-tight transition-colors duration-300",
                      isActive ? "text-white/80" : "text-m3-on-surface-variant",
                    )}
                  >
                    {status.label}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Compact "ready to publish" checklist shown above the panels while a config
// is still a draft. Surfaces the exact publish gates (settings title, ≥1
// outcome, ≥1 approved question) right where the Publish button lives, so the
// teacher sees what's missing instead of hitting a disabled-button tooltip.
// Each unmet item links to its tab.
export function PublishReadiness({
  settingsComplete,
  outcomeCount,
  approvedCount,
  draftCount,
  onGoTo,
}: {
  settingsComplete: boolean;
  outcomeCount: number;
  approvedCount: number;
  draftCount: number;
  onGoTo: (id: TabId) => void;
}) {
  const { t } = useTranslation();
  const items: {
    key: string;
    done: boolean;
    label: string;
    tab: TabId;
  }[] = [
    {
      key: "settings",
      done: settingsComplete,
      label: t("teacher_interview_config.publish_readiness.settings"),
      tab: "settings",
    },
    {
      key: "outcomes",
      done: outcomeCount > 0,
      label: t("teacher_interview_config.publish_readiness.outcomes", {
        count: outcomeCount,
      }),
      tab: "settings",
    },
    {
      key: "questions",
      done: approvedCount > 0,
      label: t("teacher_interview_config.publish_readiness.questions", {
        approved: approvedCount,
        total: draftCount,
      }),
      tab: "questions",
    },
  ];
  const allDone = items.every((i) => i.done);
  // Which items flipped false→true since the last render. Used to pop ONLY the
  // tick that just became done: animating on `item.done` alone would replay the
  // bounce on every re-render (i.e. on every keystroke in the settings form).
  const justCompleted = useJustCompleted(items);

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        allDone
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-amber-200 bg-amber-50/60",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-m3-on-surface">
          {allDone ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          )}
          {allDone
            ? t("teacher_interview_config.publish_readiness.ready")
            : t("teacher_interview_config.publish_readiness.title")}
        </span>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onGoTo(item.tab)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer",
                  item.done
                    ? "text-emerald-700 hover:bg-emerald-100"
                    : "text-amber-800 hover:bg-amber-100",
                )}
              >
                {item.done ? (
                  <Check
                    className={cn(
                      "h-3.5 w-3.5",
                      justCompleted.has(item.key) &&
                        "motion-safe:animate-[scale-in_0.3s_cubic-bezier(0.16,1,0.3,1)_both]",
                    )}
                    aria-hidden="true"
                  />
                ) : (
                  <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Keys of checklist items that flipped from not-done to done since the previous
 * render, so a completion can be acknowledged exactly once.
 *
 * A ref (not state) on purpose: this derives from props the parent already
 * re-renders on, so storing it in state would add a second render pass for no
 * benefit. Items are compared by key, so reordering the checklist is safe.
 */
function useJustCompleted(
  items: { key: string; done: boolean }[],
): Set<string> {
  const prev = useRef<Map<string, boolean>>(new Map());
  const justCompleted = new Set<string>();
  for (const item of items) {
    if (item.done && prev.current.get(item.key) === false) {
      justCompleted.add(item.key);
    }
  }
  prev.current = new Map(items.map((i) => [i.key, i.done]));
  return justCompleted;
}

/**
 * A titled settings group rendered as its own bordered card. Groups related
 * fields under one heading so the Settings tab reads as a set of tidy cards
 * (FormBold-style grouping) instead of one long scrolling column — keeps the
 * existing Material 3 tokens.
 */
function SettingsCard({
  title,
  description,
  children,
  stagger = 0,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Position in the card column, used to stagger the reveal (0 = first). */
  stagger?: number;
}) {
  return (
    <section
      // Enter animation runs unconditionally rather than via the `.reveal`
      // IntersectionObserver: `.reveal` sets a hard `opacity: 0` and useReveal()
      // unobserves after the first intersection, so a card that mounts while its
      // tab panel is `hidden` would never receive `.visible` and would stay
      // permanently invisible. A plain keyframe cannot get stuck.
      // opacity+transform only → compositor-only, no reflow.
      className="motion-safe:animate-[fade-in-up_0.4s_cubic-bezier(0.16,1,0.3,1)_both] rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-low/40 p-5 lg:p-6 space-y-4 transition-colors duration-200 hover:border-m3-outline-variant/70"
      style={{ animationDelay: `${revealDelayMs(stagger)}ms` } as CSSProperties}
    >
      <div className="space-y-1">
        <h3 className="font-headline font-extrabold text-base text-m3-on-surface">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-m3-on-surface-variant">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Stagger step, capped so the whole column is revealed within ~360ms. */
function revealDelayMs(index: number): number {
  const STEP_MS = 60;
  const MAX_STEPS = 6;
  return Math.min(Math.max(index, 0), MAX_STEPS) * STEP_MS;
}

/** Exported for tests: asserts which inputs the published freeze disables. */
export function SettingsForm({
  draft,
  setDraft,
  onSubmit,
  saving,
  dirty,
  justSaved,
  updatedAt,
  practiceQuestionCount,
  status,
  outcomesSlot,
}: {
  draft: SettingsDraft;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  onSubmit: (event: React.FormEvent) => void;
  saving: boolean;
  dirty: boolean;
  justSaved: boolean;
  updatedAt: string | null;
  /** Approved questions in the practice partition. Zero means enabling practice
      changes nothing, which the form says out loud rather than leaving the
      teacher to find out from a student. */
  practiceQuestionCount: number;
  /** Config status. On "published", settings that change how the interview is
      conducted or graded are frozen (the backend PATCH returns 409 for them),
      so the form dims them rather than inviting an edit that cannot save. */
  status: string | null | undefined;
  /** Learning-outcomes panel, injected between Guidance and Security so the
      outcomes sit above the (now bottom-most) Security & Integrity block. */
  outcomesSlot?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [securityOpen, setSecurityOpen] = useState(false);
  const [personaAdvancedOpen, setPersonaAdvancedOpen] = useState(false);
  const anyFrozen = hasFrozenFields(status);
  const frozenReason = t("teacher_interview_config.published_freeze.tooltip");
  /** Frozen-field props for a `Field`, keyed by its PATCH payload name. */
  const lock = (field: string) => ({
    frozen: isFieldFrozen(field, status),
    frozenReason,
  });
  function update<K extends keyof SettingsDraft>(
    key: K,
    value: SettingsDraft[K],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Why half the form is dimmed. Without this, a greyed-out field reads as
          a bug or a permissions problem; the fix (unpublish) is not guessable. */}
      {anyFrozen && (
        <div
          className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{t("teacher_interview_config.published_freeze.banner")}</p>
        </div>
      )}

      {/* Card 1 — Basics: identity + interviewer style grouped together, with
          persona/voice on one row (FormBold-style two-up layout). */}
      <SettingsCard
        stagger={0}
        title={t("teacher_interview_config.sections.general.title")}
        description={t("teacher_interview_config.sections.general.description")}
      >
        <Field label={t("teacher_interview_config.fields.title")}>
          <Input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={t("teacher_interview_config.fields.title_placeholder")}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label={t("teacher_interview_config.fields.persona")}
            {...lock("persona")}
          >
            <Select<Persona>
              value={draft.persona}
              onValueChange={(next) => update("persona", next)}
              options={PERSONA_KEYS.map((p) => ({
                value: p,
                label: t(`teacher_interview_config.persona.${p}`),
              }))}
            />
            <VoicePersonaGuideSheet focus="persona" />
          </Field>
          {/* Who the interviewer presents as. Orthogonal to persona: persona is
              HOW they sound, this is WHO they are. Like persona it shapes
              language only — never difficulty, question choice, or scoring. */}
          <Field
            label={t("teacher_interview_config.fields.interviewer_role")}
            hint={t("teacher_interview_config.fields.interviewer_role_hint")}
            {...lock("persona_profile")}
          >
            <Select<InterviewerRole>
              value={
                draft.persona_profile.interviewer_role ?? "generic_assistant"
              }
              onValueChange={(next) =>
                update("persona_profile", {
                  ...draft.persona_profile,
                  interviewer_role: next,
                })
              }
              options={INTERVIEWER_ROLE_KEYS.map((r) => ({
                value: r,
                label: t(`teacher_interview_config.interviewer_role.${r}`),
              }))}
            />
          </Field>
          <Field
            label={t("teacher_interview_config.fields.voice_label")}
            hint={t("teacher_interview_config.fields.voice_hint")}
            {...lock("tts_voice")}
          >
            <Select
              value={draft.tts_voice}
              onValueChange={(next) => update("tts_voice", next)}
              options={[
                {
                  value: "",
                  label: t("teacher_interview_config.fields.voice_default"),
                },
                ...VOICE_KEYS.map((v) => ({
                  value: v as string,
                  label: t(`teacher_interview_config.voice.${v}`),
                })),
              ]}
            />
            <VoicePersonaGuideSheet focus="voice" />
          </Field>
        </div>

        {/* Advanced: optional per-trait persona overrides (Phase 3). Collapsed
            by default — the persona preset is enough for most teachers; the
            sliders let a power user fine-tune tone without a new persona. Every
            dial is TONE ONLY and never affects scoring (backend enforces this).
            An override exists only for a trait moved away from its preset.

            Base UI Collapsible rather than the hand-rolled grid-rows trick this
            used to share with the Security panel. Two reasons, both correctness
            rather than polish: the old version left the collapsed content in the
            DOM at opacity-0, so every slider inside stayed in the tab order and
            keyboard users landed on invisible controls; and it animated a grid
            track, which is a layout property recomputed every frame, against
            this file's own compositor-only convention. Collapsible unmounts the
            panel when closed and animates its height via a CSS variable. */}
        <Collapsible.Root
          open={personaAdvancedOpen}
          onOpenChange={setPersonaAdvancedOpen}
          className={cn(
            "mt-4 block rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-4",
            isFieldFrozen("persona_profile", status) && "opacity-60",
          )}
        >
          <Collapsible.Trigger className="flex w-full cursor-pointer list-none items-center gap-3 text-left">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-m3-primary/10 text-m3-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-m3-on-surface">
                {t("teacher_interview_config.persona_traits.advanced_label")}
                {isFieldFrozen("persona_profile", status) && (
                  <Lock
                    className="ml-1.5 inline-block h-3 w-3 align-text-top"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="block text-xs text-m3-on-surface-variant">
                {t("teacher_interview_config.persona_traits.help")}
              </span>
            </span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-m3-on-surface-variant transition-transform duration-300 ${
                personaAdvancedOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </Collapsible.Trigger>

          <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-300 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
            <div>
              <div className="mt-5 space-y-4 border-t border-m3-outline-variant/20 pt-5">
                {(() => {
                  const effective = effectivePersonaTraits(
                    draft.persona,
                    draft.persona_profile,
                  );
                  return PERSONA_TRAIT_KEYS.map((traitKey) => (
                    <div key={traitKey} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`persona-trait-${traitKey}`}
                          className="text-xs font-medium text-m3-on-surface"
                        >
                          {t(
                            `teacher_interview_config.persona_traits.trait.${traitKey}`,
                          )}
                        </label>
                        <span className="text-xs tabular-nums text-m3-on-surface-variant">
                          {effective[traitKey]} / 4
                        </span>
                      </div>
                      <input
                        id={`persona-trait-${traitKey}`}
                        type="range"
                        min={0}
                        max={4}
                        step={1}
                        value={effective[traitKey]}
                        disabled={isFieldFrozen("persona_profile", status)}
                        onChange={(e) =>
                          update("persona_profile", {
                            ...draft.persona_profile,
                            [traitKey]: Number(e.target.value),
                          })
                        }
                        className="w-full cursor-pointer accent-m3-primary disabled:cursor-not-allowed"
                      />
                      <p className="text-[11px] text-m3-on-surface-variant">
                        {t(
                          `teacher_interview_config.persona_traits.trait_hint.${traitKey}`,
                        )}
                      </p>
                    </div>
                  ));
                })()}
                <button
                  type="button"
                  onClick={() => update("persona_profile", {})}
                  disabled={isFieldFrozen("persona_profile", status)}
                  className="text-xs font-medium text-m3-primary hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
                >
                  {t("teacher_interview_config.persona_traits.reset")}
                </button>
              </div>
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      </SettingsCard>

      {/* Card 2 — Scoring & timing: the three numeric knobs on one 3-up row. */}
      <SettingsCard
        stagger={1}
        title={t("teacher_interview_config.sections.rules.title")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* All three are unbounded-by-default numeric knobs whose empty state
              means something ("unlimited"), so each carries its unit inside the
              field — an anonymous empty box gave no clue whether it wanted
              minutes, seconds or a count. */}
          <Field
            label={t("teacher_interview_config.fields.duration_label")}
            hint={t("teacher_interview_config.fields.duration_hint")}
            {...lock("time_limit_minutes")}
          >
            <Input
              type="number"
              min={1}
              max={180}
              value={draft.time_limit_minutes}
              onChange={(e) => update("time_limit_minutes", e.target.value)}
              placeholder={t(
                "teacher_interview_config.fields.duration_placeholder",
              )}
              endAdornment={t("teacher_interview_config.units.minutes")}
            />
          </Field>
          <Field
            label={t("teacher_interview_config.fields.attempts_label")}
            hint={t("teacher_interview_config.fields.duration_hint")}
            {...lock("max_attempts")}
          >
            <Input
              type="number"
              min={1}
              value={draft.max_attempts}
              onChange={(e) => update("max_attempts", e.target.value)}
              placeholder={t(
                "teacher_interview_config.fields.attempts_placeholder",
              )}
              endAdornment={t("teacher_interview_config.units.attempts")}
            />
          </Field>
          <Field
            label={t("teacher_interview_config.fields.criteria_label")}
            hint={t("teacher_interview_config.fields.criteria_hint")}
            {...lock("min_outcomes_to_pass")}
          >
            <Input
              type="number"
              min={1}
              value={draft.min_outcomes_to_pass}
              onChange={(e) => update("min_outcomes_to_pass", e.target.value)}
              placeholder={t(
                "teacher_interview_config.fields.criteria_placeholder",
              )}
              endAdornment={t("teacher_interview_config.units.outcomes")}
            />
          </Field>
        </div>

        {/* Practice mode. Full width under the numeric grid because it needs
            two lines of consequence text, not a one-line hint. */}
        <div
          className={cn(
            "mt-4 rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-lowest p-3",
            isFieldFrozen("practice_mode_enabled", status) && "opacity-60",
          )}
          title={
            isFieldFrozen("practice_mode_enabled", status)
              ? frozenReason
              : undefined
          }
        >
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={draft.practice_mode_enabled}
              disabled={isFieldFrozen("practice_mode_enabled", status)}
              onChange={(e) =>
                update("practice_mode_enabled", e.target.checked)
              }
              className="mt-0.5 size-4 shrink-0 accent-m3-primary"
            />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-m3-on-surface">
                {t("teacher_interview_config.fields.practice_label")}
              </span>
              <span className="mt-1 block text-xs leading-5 text-m3-on-surface-variant">
                {t("teacher_interview_config.fields.practice_hint")}
              </span>
            </span>
          </label>

          {/* Both consequences of ticking this box, stated rather than
              discovered: it discloses criterion text to students, and it does
              nothing at all until questions are moved into the practice set. */}
          {draft.practice_mode_enabled && (
            <div className="mt-3 space-y-2 border-t border-m3-outline-variant/30 pt-3">
              <p className="text-xs leading-5 text-m3-on-surface-variant">
                {t("teacher_interview_config.fields.practice_rubric_notice")}
              </p>
              {practiceQuestionCount === 0 && (
                <p
                  className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-semibold leading-5 text-amber-800"
                  role="status"
                >
                  <TriangleAlert
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {t("teacher_interview_config.fields.practice_empty_warning")}
                </p>
              )}
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Card 3 — Guidance for AI: free-text prose (fed to the question
          generator) plus the structured scoring rubric (graded against). */}
      <SettingsCard
        stagger={2}
        title={t("teacher_interview_config.sections.guidance.title")}
        description={t(
          "teacher_interview_config.sections.guidance.description",
        )}
      >
        <Field
          label={t("teacher_interview_config.fields.notes_label")}
          hint={t("teacher_interview_config.fields.notes_hint")}
          {...lock("supplementary_instructions")}
        >
          <Textarea
            value={draft.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={4}
            placeholder={t(
              "teacher_interview_config.fields.supplementary_placeholder",
            )}
          />
        </Field>

        {/* The rubric is serialized into supplementary_instructions, which the
            evaluator reads — so it freezes with that field, not separately. */}
        <div
          className={cn(
            isFieldFrozen("supplementary_instructions", status) &&
              "pointer-events-none opacity-60",
          )}
          title={
            isFieldFrozen("supplementary_instructions", status)
              ? frozenReason
              : undefined
          }
          aria-disabled={
            isFieldFrozen("supplementary_instructions", status) || undefined
          }
        >
          <RubricEditor
            criteria={draft.rubric_criteria}
            onChange={(next) => update("rubric_criteria", next)}
          />
        </div>
      </SettingsCard>

      {/* Learning outcomes sit above Security & Integrity (which is now the
          bottom-most block). Injected here as a slot so it lives inside the
          settings flow without SettingsForm needing to know the outcomes API. */}
      {outcomesSlot}

      {/* Collapsible for the same reasons as the persona panel above: this one
          holds a response-policy select, a max-attempts number and two custom
          refusal textareas, all of which stayed tabbable while the section was
          closed. */}
      <Collapsible.Root
        open={securityOpen}
        onOpenChange={setSecurityOpen}
        className="block rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-4"
      >
        <Collapsible.Trigger className="flex w-full cursor-pointer list-none items-center gap-3 text-left">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-m3-on-surface">
              {t("teacher_interview_config.security.title")}
            </span>
            <span className="block text-xs text-m3-on-surface-variant">
              {t("teacher_interview_config.security.description")}
            </span>
          </span>
          <span className="text-xs font-bold text-emerald-700">
            {t("teacher_interview_config.security.mandatory")}
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-m3-on-surface-variant transition-transform duration-300 ${
              securityOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </Collapsible.Trigger>

        <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-300 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
          <div>
            <div className="mt-5 space-y-5 border-t border-m3-outline-variant/20 pt-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_interview_config.security.protected_by_platform")}
                </p>
                <ul className="mt-2 grid gap-2 text-sm text-m3-on-surface sm:grid-cols-2">
                  {["questions", "answers", "rubrics", "prompts", "state"].map(
                    (item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600" />
                        {t(
                          `teacher_interview_config.security.protected.${item}`,
                        )}
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("teacher_interview_config.security.response_policy")}
                  {...lock("security_response_policy")}
                >
                  <Select<SecurityResponsePolicy>
                    value={draft.security_response_policy}
                    onValueChange={(next) =>
                      update("security_response_policy", next)
                    }
                    options={(
                      [
                        "continue_and_log",
                        "warn_and_continue",
                        "end_and_flag",
                      ] as SecurityResponsePolicy[]
                    ).map((policy) => ({
                      value: policy,
                      label: t(
                        `teacher_interview_config.security.policy.${policy}`,
                      ),
                    }))}
                  />
                </Field>
                <Field
                  label={t("teacher_interview_config.security.max_attempts")}
                  {...lock("security_max_consecutive_attempts")}
                >
                  <Input
                    type="number"
                    min={2}
                    max={20}
                    value={draft.security_max_consecutive_attempts}
                    onChange={(e) =>
                      update(
                        "security_max_consecutive_attempts",
                        e.target.value,
                      )
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4">
                <Field
                  label={t("teacher_interview_config.security.custom_en")}
                  {...lock("security_custom_refusal_en")}
                >
                  <Textarea
                    rows={3}
                    maxLength={500}
                    value={draft.security_custom_refusal_en}
                    onChange={(e) =>
                      update("security_custom_refusal_en", e.target.value)
                    }
                  />
                  <p className="mt-2 rounded-lg bg-m3-surface-container px-3 py-2 text-xs text-m3-on-surface-variant">
                    {draft.security_custom_refusal_en.trim() ||
                      t("teacher_interview_config.security.preview_en")}
                  </p>
                </Field>
              </div>

              <ToggleRow
                label={t("teacher_interview_config.security.incident_summary")}
                description={t(
                  "teacher_interview_config.security.incident_summary_description",
                )}
                value={draft.security_incident_summary_enabled}
                onChange={(value) =>
                  update("security_incident_summary_enabled", value)
                }
              />
              <p className="text-[11px] text-m3-on-surface-variant">
                {t("teacher_interview_config.security.rules_hidden")}
              </p>
            </div>
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-m3-outline-variant/20">
        <p className="text-[11px] text-m3-on-surface-variant">
          {t("teacher_interview_config.actions.save_config_scope_hint")}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          {/* Keyed on the status it will render: a key on the element returned
              *inside* SaveStatus would do nothing (React only diffs keys among
              siblings), so the remount that triggers the enter animation has to
              be forced from the call site. */}
          <SaveStatus
            key={
              saving ? "saving" : dirty ? "dirty" : justSaved ? "saved" : "idle"
            }
            saving={saving}
            dirty={dirty}
            justSaved={justSaved}
            updatedAt={updatedAt}
          />
          <Button
            type="submit"
            disabled={saving || !dirty}
            className="gap-2 gradient-primary text-white border-0 hover:shadow-ai-glow shrink-0"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("teacher_interview_config.actions.save_config")}
          </Button>
        </div>
      </div>
    </form>
  );
}

// Compact save-state indicator shown beside the Save button so the teacher
// always knows whether their edits are persisted: Saving… while the request
// is in flight, "Unsaved changes" (amber dot) when the draft differs from the
// saved config, and a transient "Saved" (green check) right after a save.
function SaveStatus({
  saving,
  dirty,
  justSaved,
  updatedAt,
}: {
  saving: boolean;
  dirty: boolean;
  justSaved: boolean;
  updatedAt: string | null;
}) {
  const { t, i18n } = useTranslation();

  // Every branch shares one animated shell. The remount that replays the enter
  // animation is forced by a `key` at the CALL SITE (a key here would be inert —
  // React only diffs keys among siblings). This is the feedback for the page's
  // primary action (saving settings), so the 250ms is worth it.
  // opacity+transform only → compositor-only, no reflow.
  function shell(children: React.ReactNode, className: string) {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-1.5 text-[11px] motion-safe:animate-[fade-in-up_0.25s_ease-out_both]",
          className,
        )}
      >
        {children}
      </span>
    );
  }

  if (saving) {
    return shell(
      <>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        {t("teacher_interview_config.save_status.saving")}
      </>,
      "font-semibold text-m3-on-surface-variant",
    );
  }
  if (dirty) {
    return shell(
      <>
        <span
          className="h-2 w-2 rounded-full bg-amber-500"
          aria-hidden="true"
        />
        {t("teacher_interview_config.save_status.unsaved")}
      </>,
      "font-semibold text-amber-700",
    );
  }
  if (justSaved) {
    return shell(
      <>
        {/* Tick pops in rather than appearing flat — the one moment on this
            page worth a beat of acknowledgement. */}
        <CheckCircle2
          className="h-3.5 w-3.5 motion-safe:animate-[scale-in_0.3s_cubic-bezier(0.16,1,0.3,1)_both]"
          aria-hidden="true"
        />
        {t("teacher_interview_config.save_status.saved")}
      </>,
      "font-semibold text-emerald-600",
    );
  }
  if (updatedAt) {
    const when = new Date(updatedAt).toLocaleString(
      i18n.language?.startsWith("vi") ? "vi-VN" : "en-US",
      { dateStyle: "medium", timeStyle: "short" },
    );
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-m3-on-surface-variant">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {t("teacher_interview_config.save_status.last_saved", { when })}
      </span>
    );
  }
  return null;
}

/** Format seconds as m:ss (matches the quiz generation progress readout). */
function formatElapsedSeconds(seconds: number): string {
  if (seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Live-ticking elapsed timer for a generation run (mirrors the quiz
 * GenerationProgress behaviour). Ticks locally off `startedAt` while running
 * and freezes at `frozenEnd` once the run reaches a terminal state.
 */
function useGenerationElapsed(
  startedAt: string | null | undefined,
  frozenEnd: string | null | undefined,
): number {
  const [now, setNow] = useState(() => Date.now());
  const running = Boolean(startedAt) && !frozenEnd;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return useMemo(() => {
    if (!startedAt) return 0;
    const start = new Date(startedAt).getTime();
    if (Number.isNaN(start)) return 0;
    const endMs = frozenEnd ? new Date(frozenEnd).getTime() : now;
    const end = Number.isNaN(endMs) ? now : endMs;
    return Math.max(0, (end - start) / 1000);
  }, [startedAt, frozenEnd, now]);
}

function GenerationSection({
  generationForm,
  setGenerationForm,
  onGenerate,
  generating,
  activeRunId,
  run,
  modules,
  ownModuleId,
  outcomes,
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
}) {
  const { t } = useTranslation();
  function updateGeneration<K extends keyof GenerationFormState>(
    key: K,
    value: GenerationFormState[K],
  ) {
    setGenerationForm((current) => ({ ...current, [key]: value }));
  }

  const inProgress =
    generating ||
    Boolean(
      activeRunId &&
        (!run || run.status === "pending" || run.status === "running"),
    );
  const failed = run?.status === "failed";
  const completed = run?.status === "completed";

  // Live progress the pipeline writes into config_json.progress each round
  // ({ phase, accepted, target }). Falls back to the completed summary's
  // questions_persisted / question_count_requested once the run finishes.
  const progress = readGenerationProgress(run);

  // Live elapsed timer (quiz-style): ticks while running, freezes on finish.
  const isTerminal = failed || completed || run?.status === "cancelled";
  const elapsed = useGenerationElapsed(
    run?.started_at,
    isTerminal ? (run?.finished_at ?? null) : null,
  );

  return (
    <div className="rounded-xl border-2 border-dashed border-m3-secondary/30 bg-m3-secondary/[0.03] p-6 lg:p-8 space-y-5">
      <Section
        title={t("teacher_interview_config.generate.section_title")}
        description={t("teacher_interview_config.generate.section_description")}
      >
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

        <Field
          label={t("teacher_interview_config.generate.modules_label")}
          hint={t("teacher_interview_config.generate.modules_hint")}
        >
          <div className="flex flex-wrap gap-1.5">
            {modules.length === 0 ? (
              <p className="text-xs text-m3-on-surface-variant">
                {t("teacher_interview_config.generate.modules_empty")}
              </p>
            ) : (
              modules.map((m) => {
                const selected = generationForm.source_module_ids.includes(
                  m.id,
                );
                const isOwn = m.id === ownModuleId;
                const effectiveSelected =
                  selected ||
                  (generationForm.source_module_ids.length === 0 && isOwn);
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={effectiveSelected}
                    onClick={() =>
                      updateGeneration(
                        "source_module_ids",
                        selected
                          ? generationForm.source_module_ids.filter(
                              (id) => id !== m.id,
                            )
                          : [...generationForm.source_module_ids, m.id],
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      effectiveSelected
                        ? "border-m3-secondary bg-m3-secondary/10 text-m3-secondary font-semibold"
                        : "border-m3-outline-variant/40 bg-m3-surface text-m3-on-surface-variant hover:bg-m3-surface-container-low",
                    )}
                  >
                    {m.title}
                    {isOwn && (
                      <span className="text-[10px] opacity-70">
                        {t("teacher_interview_config.generate.modules_own")}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </Field>

        <Field
          label={t("teacher_interview_config.generate.outcomes_label")}
          hint={t("teacher_interview_config.generate.outcomes_hint")}
        >
          {outcomes.length === 0 ? (
            <p className="rounded-xl bg-m3-surface p-4 text-sm text-m3-on-surface-variant">
              {t("teacher_interview_config.generate.outcomes_empty")}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    updateGeneration(
                      "target_outcome_ids",
                      generationForm.target_outcome_ids.length ===
                        outcomes.length
                        ? []
                        : outcomes.map((o) => o.id),
                    )
                  }
                  className="text-xs font-semibold text-m3-secondary hover:text-m3-primary cursor-pointer"
                >
                  {generationForm.target_outcome_ids.length === outcomes.length
                    ? t("teacher_interview_config.generate.outcomes_clear")
                    : t(
                        "teacher_interview_config.generate.outcomes_select_all",
                      )}
                </button>
              </div>
              {outcomes.map((outcome, index) => {
                const checked = generationForm.target_outcome_ids.includes(
                  outcome.id,
                );
                return (
                  <label
                    key={outcome.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-all",
                      checked
                        ? "border-m3-secondary bg-m3-secondary-fixed/30"
                        : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-surface-container-low",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        updateGeneration(
                          "target_outcome_ids",
                          checked
                            ? generationForm.target_outcome_ids.filter(
                                (id) => id !== outcome.id,
                              )
                            : [
                                ...generationForm.target_outcome_ids,
                                outcome.id,
                              ],
                        )
                      }
                      className="h-4 w-4"
                    />
                    {/* Was bg-violet-100/text-violet-700. Purple is banned by
                        the design system; it survived because the guard script
                        greps a directory that no longer exists and so passes
                        unconditionally. Uses the primary token like every other
                        index badge in this file. */}
                    <span className="shrink-0 rounded-md bg-m3-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-m3-primary">
                      {t("teacher_interview_config.generate.outcomes_badge", {
                        n: index + 1,
                      })}
                    </span>
                    <span className="flex-1 text-sm text-m3-on-surface">
                      {outcome.outcome_text}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </Field>

        <Field
          label={t("teacher_interview_config.generate.focus_label")}
          hint={t("teacher_interview_config.generate.focus_hint")}
        >
          <Input
            value={generationForm.focus_topics}
            onChange={(e) => updateGeneration("focus_topics", e.target.value)}
            placeholder={t(
              "teacher_interview_config.generate.focus_placeholder",
            )}
          />
        </Field>

        <Field
          label={t("teacher_interview_config.generate.avoid_label")}
          hint={t("teacher_interview_config.generate.avoid_hint")}
        >
          <Input
            value={generationForm.avoid_topics}
            onChange={(e) => updateGeneration("avoid_topics", e.target.value)}
            placeholder={t(
              "teacher_interview_config.generate.avoid_placeholder",
            )}
          />
        </Field>

        <p className="text-[11px] text-m3-on-surface-variant">
          {t("teacher_interview_config.generate.reuses_settings_hint")}
        </p>

        {activeRunId && (
          <div
            className={cn(
              "rounded-xl px-4 py-3 text-sm border",
              failed
                ? "border-red-200 bg-red-50 text-red-800"
                : completed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-blue-200 bg-blue-50 text-blue-800",
            )}
          >
            {/* Header: status icon + headline on the left; stepped % (when
                known) + live elapsed timer on the right — mirrors the quiz
                GenerationProgress layout. */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 font-bold">
                {inProgress ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : failed ? (
                  <X className="h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">
                  {inProgress
                    ? t("teacher_interview_config.generate.in_progress")
                    : failed
                      ? t("teacher_interview_config.generate.failed")
                      : t("teacher_interview_config.generate.completed")}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
                {progress && !failed && (
                  <span className="font-extrabold">
                    {progress.accepted}/{progress.target}
                  </span>
                )}
                <span
                  className="opacity-80"
                  title={t("teacher_interview_config.generate.elapsed")}
                >
                  {formatElapsedSeconds(elapsed)}
                </span>
              </div>
            </div>

            {!failed && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>
                    {completed
                      ? t("teacher_interview_config.generate.phase_done")
                      : progress?.phase === "saving"
                        ? t("teacher_interview_config.generate.phase_saving")
                        : t(
                            "teacher_interview_config.generate.phase_generating",
                          )}
                  </span>
                  {progress && (
                    <span className="tabular-nums">{progress.percent}%</span>
                  )}
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-current/15">
                  {progress ? (
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500 ease-out",
                        completed ? "bg-emerald-500" : "bg-blue-500",
                      )}
                      style={{
                        width: `${Math.max(progress.percent, inProgress ? 6 : 0)}%`,
                      }}
                    />
                  ) : (
                    /* No checkpoint yet — indeterminate pulse instead of a fake 0%. */
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-500/60" />
                  )}
                </div>
              </div>
            )}

            {failed && run?.failure_message && (
              <p className="mt-1 text-xs">{run.failure_message}</p>
            )}
            {completed && (
              <p className="mt-1 text-xs">
                {t("teacher_interview_config.generate.success_body")}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-dashed border-m3-secondary/30">
          <p className="text-[11px] text-m3-on-surface-variant">
            {t("teacher_interview_config.generate.independent_action_hint")}
          </p>
          <Button
            type="button"
            onClick={onGenerate}
            disabled={inProgress}
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

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-headline font-extrabold text-base text-m3-on-surface">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-m3-on-surface-variant">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  frozen = false,
  frozenReason,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  /** Dim + disable this field (frozen while the config is published). */
  frozen?: boolean;
  /** Tooltip explaining why, shown on the dimmed field. */
  frozenReason?: string;
  children: React.ReactNode;
}) {
  const generatedId = useId();
  // Associate the label with its control, and disable it when frozen.
  //
  // Done by cloning rather than by wrapping the control in the <label>:
  // implicit association would swallow any other interactive child, and the
  // persona field puts a "View guide" button next to its Select, which would
  // then toggle the Select when clicked.
  //
  // The FIRST element child is treated as the control. Earlier this only fired
  // for a lone child, which quietly did nothing on exactly the fields that have
  // a sibling: AI persona and AI voice both render `Select` + a "View guide"
  // link, so they stayed fully operable while dimmed — the freeze looked applied
  // but the dropdown still changed the value. Later children (a guide link, a
  // preview paragraph) are deliberately left alone: reading the persona guide is
  // harmless on a published config, and disabling it would remove information
  // for no gain.
  const childArray = Children.toArray(children);
  const controlIndex = childArray.findIndex((child) => isValidElement(child));
  const control =
    controlIndex >= 0 ? (childArray[controlIndex] as ReactElement) : null;
  const childProps = (control?.props ?? {}) as {
    id?: string;
    disabled?: boolean;
  };
  const controlId = childProps.id ?? (control ? generatedId : undefined);
  // A frozen field is disabled at the control, not merely dimmed: greying an
  // input the teacher can still type into (only to have the save 409) is worse
  // than not dimming it at all. `disabled` is only forced ON — a control the
  // caller already disabled for its own reason stays disabled.
  const extraProps: { id?: string; disabled?: boolean } = {};
  if (control && !childProps.id) extraProps.id = generatedId;
  if (control && frozen) extraProps.disabled = true;
  const wired =
    control && Object.keys(extraProps).length > 0
      ? childArray.map((child, index) =>
          index === controlIndex
            ? cloneElement(
                control as ReactElement<{ id?: string; disabled?: boolean }>,
                extraProps,
              )
            : child,
        )
      : children;

  return (
    <div
      className={cn("space-y-1.5", frozen && "opacity-60")}
      title={frozen ? frozenReason : undefined}
    >
      <label
        htmlFor={controlId}
        className="block text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant"
      >
        {label}
        {frozen && (
          <Lock
            className="ml-1.5 inline-block h-3 w-3 align-text-top"
            aria-hidden="true"
          />
        )}
      </label>
      {wired}
      {hint && <p className="text-[11px] text-m3-on-surface-variant">{hint}</p>}
    </div>
  );
}

/**
 * A small "View guide" link that opens a side sheet describing every AI
 * persona and every AI voice in one place. Shown under both the AI persona and
 * AI voice fields so a teacher can look up what each option sounds like before
 * choosing. ``focus`` scrolls/hints which table is most relevant to the field
 * the link sits under, but both tables are always present.
 */
export function RubricEditor({
  criteria,
  onChange,
}: {
  criteria: RubricCriterion[];
  onChange: (next: RubricCriterion[]) => void;
}) {
  const { t } = useTranslation();

  function updateAt(index: number, patch: Partial<RubricCriterion>) {
    onChange(criteria.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeAt(index: number) {
    onChange(criteria.filter((_, i) => i !== index));
  }

  function addCriterion() {
    if (criteria.length >= MAX_CRITERIA) return;
    onChange([...criteria, { name: "", weight: 1, description: "" }]);
  }

  const atCap = criteria.length >= MAX_CRITERIA;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_interview_config.fields.rubric_label")}
        </label>
        <p className="text-[11px] text-m3-on-surface-variant">
          {t("teacher_interview_config.fields.rubric_hint")}
        </p>
      </div>

      {criteria.length === 0 ? (
        <p className="rounded-xl border border-dashed border-m3-outline-variant/40 bg-m3-surface px-3 py-4 text-center text-xs text-m3-on-surface-variant">
          {t("teacher_interview_config.fields.rubric_empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {criteria.map((criterion, index) => (
            <div
              key={index}
              className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                    <Input
                      value={criterion.name}
                      maxLength={MAX_CRITERION_NAME_CHARS}
                      onChange={(e) =>
                        updateAt(index, { name: e.target.value })
                      }
                      placeholder={t(
                        "teacher_interview_config.fields.rubric_name_placeholder",
                      )}
                    />
                    <label className="flex items-center gap-2 text-xs text-m3-on-surface-variant">
                      <span className="whitespace-nowrap">
                        {t("teacher_interview_config.fields.rubric_weight")}
                      </span>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={String(criterion.weight)}
                        onChange={(e) =>
                          updateAt(index, {
                            weight: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-20"
                      />
                    </label>
                  </div>
                  <Textarea
                    value={criterion.description}
                    onChange={(e) =>
                      updateAt(index, { description: e.target.value })
                    }
                    rows={2}
                    placeholder={t(
                      "teacher_interview_config.fields.rubric_description_placeholder",
                    )}
                    className="rounded-lg py-2"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={t(
                    "teacher_interview_config.fields.rubric_remove",
                  )}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-m3-on-surface-variant hover:bg-m3-error/10 hover:text-m3-error cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCriterion}
        disabled={atCap}
        className="gap-1.5"
      >
        <Plus className="h-4 w-4" />
        {atCap
          ? t("teacher_interview_config.fields.rubric_at_cap", {
              max: MAX_CRITERIA,
            })
          : t("teacher_interview_config.fields.rubric_add")}
      </Button>
    </div>
  );
}

export function VoicePersonaGuideSheet({
  focus,
}: {
  focus: "persona" | "voice";
}) {
  const { t } = useTranslation();
  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-m3-primary hover:underline cursor-pointer"
          />
        }
      >
        <HelpCircle className="h-3 w-3" aria-hidden="true" />
        {t(
          focus === "persona"
            ? "teacher_interview_config.voice_guide.open_persona"
            : "teacher_interview_config.voice_guide.open_voice",
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-md">
        <div className="space-y-6">
          <header className="space-y-1 pr-8">
            <h2 className="font-headline text-lg font-extrabold text-m3-on-surface">
              {t("teacher_interview_config.voice_guide.title")}
            </h2>
            <p className="text-xs text-m3-on-surface-variant">
              {t("teacher_interview_config.voice_guide.subtitle")}
            </p>
          </header>

          {/* Persona table */}
          <section
            className={cn(
              "space-y-2",
              focus === "persona" &&
                "rounded-lg ring-1 ring-m3-primary/30 p-2 -m-2",
            )}
          >
            <h3 className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("teacher_interview_config.voice_guide.persona_heading")}
            </h3>
            <table className="w-full text-left text-xs">
              <tbody>
                {PERSONA_KEYS.map((p) => (
                  <tr
                    key={p}
                    className="border-b border-m3-outline-variant/20 align-top"
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap py-2 pr-3 font-semibold text-m3-on-surface"
                    >
                      {t(`teacher_interview_config.persona.${p}`)}
                    </th>
                    <td className="py-2 text-m3-on-surface-variant">
                      {t(
                        `teacher_interview_config.voice_guide.persona_desc.${p}`,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Voice table */}
          <section
            className={cn(
              "space-y-2",
              focus === "voice" &&
                "rounded-lg ring-1 ring-m3-primary/30 p-2 -m-2",
            )}
          >
            <h3 className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("teacher_interview_config.voice_guide.voice_heading")}
            </h3>
            <p className="text-[11px] text-m3-on-surface-variant">
              {t("teacher_interview_config.voice_guide.voice_note")}
            </p>
            <table className="w-full text-left text-xs">
              <tbody>
                {VOICE_KEYS.map((v) => (
                  <tr
                    key={v}
                    className="border-b border-m3-outline-variant/20 align-top"
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap py-2 pr-3 font-semibold text-m3-on-surface"
                    >
                      {t(`teacher_interview_config.voice.${v}`)}
                    </th>
                    <td className="py-2 text-m3-on-surface-variant">
                      {t(
                        `teacher_interview_config.voice_guide.voice_desc.${v}`,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-m3-on-surface">{label}</p>
        <p className="text-xs text-m3-on-surface-variant mt-0.5">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/50 shrink-0 cursor-pointer",
          value ? "bg-m3-primary" : "bg-m3-surface-container-high",
        )}
      >
        {/* Knob moves by transform, not by `left`. Animating `left` under
            `transition-all` recomputed layout on every frame of every toggle;
            a translate runs on the compositor and matches the opacity/transform
            rule the rest of this file follows. */}
        <span
          className={cn(
            "absolute top-1 left-1 w-4 h-4 rounded-full shadow-sm transition-[transform,background-color] duration-200 ease-out",
            value
              ? "translate-x-5 bg-surface-elev"
              : "translate-x-0 bg-slate-400",
          )}
        />
      </button>
    </div>
  );
}
