import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  SectionNav,
  type SectionNavItem,
  type SectionStatus,
} from "@/components/ui/section-nav";
import { QuestionBank } from "@/routes/teacher/_components/question-bank";
import { LearningOutcomes } from "@/routes/teacher/_components/learning-outcomes";
import { AdaptiveReadinessPanel } from "@/routes/teacher/_components/adaptive-readiness-panel";
import {
  useArchiveInterviewConfig,
  useCreateInterviewQuestion,
  useDeleteInterviewConfig,
  useDeleteInterviewQuestion,
  useGenerateInterviewQuestions,
  useInterviewForAuthoring,
  useInterviewGenerationRun,
  usePublishInterviewConfig,
  useUnarchiveInterviewConfig,
  useUnpublishInterviewConfig,
  useUpdateInterviewConfig,
  useUpdateInterviewQuestion,
} from "@/lib/api/hooks/interviews";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/teacher-courses";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  InterviewConfigAuthoring,
  InterviewConfigUpdate,
  InterviewGenerationRequest,
  InterviewGenerationRunPublic,
  InterviewOutcomeAuthoring,
  InterviewQuestionAuthoring,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

type SupportedMode = NonNullable<InterviewConfigUpdate["supported_modes"]>;
type Persona = NonNullable<InterviewConfigUpdate["persona"]>;
type GenerationMode = InterviewGenerationRequest["mode"];
type SecurityResponsePolicy =
  | "continue_and_log"
  | "warn_and_continue"
  | "end_and_flag";

interface GenerationFormState {
  mode: GenerationMode;
  question_count: number;
  focus_topics: string;
  avoid_topics: string;
}

interface SettingsDraft {
  title: string;
  persona: Persona;
  supported_modes: SupportedMode;
  time_limit_minutes: string;
  max_attempts: string;
  min_outcomes_to_pass: string;
  lock_quiz_ef_until_pass: boolean;
  supplementary_instructions: string;
  security_response_policy: SecurityResponsePolicy;
  security_max_consecutive_attempts: string;
  security_custom_refusal_en: string;
  security_custom_refusal_vi: string;
  security_incident_summary_enabled: boolean;
}

function draftFromConfig(config: InterviewConfigAuthoring): SettingsDraft {
  return {
    title: config.title ?? "",
    persona: (config.persona ?? "neutral") as Persona,
    supported_modes: config.supported_modes,
    time_limit_minutes:
      config.time_limit_minutes == null ? "" : String(config.time_limit_minutes),
    max_attempts:
      config.max_attempts == null ? "" : String(config.max_attempts),
    min_outcomes_to_pass:
      config.min_outcomes_to_pass == null
        ? ""
        : String(config.min_outcomes_to_pass),
    lock_quiz_ef_until_pass: config.lock_quiz_ef_until_pass,
    supplementary_instructions: config.supplementary_instructions ?? "",
    security_response_policy:
      config.security_response_policy ?? "warn_and_continue",
    security_max_consecutive_attempts: String(
      config.security_max_consecutive_attempts ?? 3,
    ),
    security_custom_refusal_en: config.security_custom_refusal_en ?? "",
    security_custom_refusal_vi: config.security_custom_refusal_vi ?? "",
    security_incident_summary_enabled:
      config.security_incident_summary_enabled ?? true,
  };
}

function integerOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

const PERSONA_KEYS: Persona[] = ["strict", "neutral", "supportive"];
const MODE_KEYS: SupportedMode[] = ["hybrid", "text", "voice"];

export default function InterviewConfigPage() {
  const { t } = useTranslation();
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
    () => (questions ?? []).filter((q) => q.review_status === "approved").length,
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
    const el = document.getElementById("questions");
    if (el) {
      const prefersReduced = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const top =
        el.getBoundingClientRect().top + window.scrollY - 128;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: prefersReduced ? "auto" : "smooth",
      });
    }
  }
  const [generationForm, setGenerationForm] = useState({
    mode: "outcome-based" as GenerationMode,
    question_count: 5,
    focus_topics: "",
    avoid_topics: "",
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
          label: t("teacher_interview_config.section_nav.status.settings_incomplete"),
        };

    const outcomesStatus: SectionStatus =
      outcomeCount > 0
        ? {
            kind: "completed",
            label: t("teacher_interview_config.section_nav.status.outcomes_count", {
              count: outcomeCount,
            }),
          }
        : {
            kind: "warning",
            label: t("teacher_interview_config.section_nav.status.not_added"),
          };

    const generateStatus: SectionStatus =
      draftCount > 0
        ? {
            kind: "info",
            label: t("teacher_interview_config.section_nav.status.generated_count", {
              count: draftCount,
            }),
          }
        : { kind: "none" };

    const questionsStatus: SectionStatus =
      draftCount > 0
        ? {
            kind: approvedCount === draftCount ? "completed" : "info",
            label: t("teacher_interview_config.section_nav.status.approved_ratio", {
              approved: approvedCount,
              total: draftCount,
            }),
          }
        : {
            kind: "warning",
            label: t("teacher_interview_config.section_nav.status.no_questions"),
          };

    return [
      {
        id: "settings",
        label: t("teacher_interview_config.section_nav.settings"),
        shortLabel: t("teacher_interview_config.section_nav.settings_short"),
        status: settingsStatus,
      },
      {
        id: "learning-outcomes",
        label: t("teacher_interview_config.section_nav.learning_outcomes"),
        shortLabel: t("teacher_interview_config.section_nav.learning_outcomes_short"),
        status: outcomesStatus,
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
        shortLabel: t("teacher_interview_config.section_nav.adaptive_readiness_short"),
        status: { kind: "none" },
      },
    ];
  }, [t, settingsComplete, outcomeCount, draftCount, approvedCount]);

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
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
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error(t("teacher_interview_config.errors.title_required"));
      return;
    }
    try {
      await updateConfig.mutateAsync({
        title: draft.title.trim(),
        persona: draft.persona,
        supported_modes: draft.supported_modes,
        time_limit_minutes: integerOrNull(draft.time_limit_minutes),
        max_attempts: integerOrNull(draft.max_attempts),
        min_outcomes_to_pass: integerOrNull(draft.min_outcomes_to_pass),
        lock_quiz_ef_until_pass: draft.lock_quiz_ef_until_pass,
        supplementary_instructions:
          draft.supplementary_instructions.trim() || null,
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
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.save_failed"),
      );
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
        toast.error(t("teacher_interview_config.errors.publish_blocked_archived"));
      } else if (/interview_no_outcomes|outcome/i.test(message)) {
        toast.error(t("teacher_interview_config.errors.outcomes_required"));
      } else if (
        approvedCount === 0 ||
        /interview_no_approved_questions|question|insufficient|empty/i.test(message)
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
        source_lesson_ids: [],
        persona: draft?.persona,
        supplementary_instructions:
          draft?.supplementary_instructions.trim() || null,
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
          { label: t("teacher_common.breadcrumb_teaching"), to: "/teacher/courses" },
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
          {!isArchived && (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={handleArchive}
              disabled={archiveConfig.isPending}
            >
              {archiveConfig.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t("teacher_interview_config.actions.archive")}
            </Button>
          )}
          {isArchived && (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={handleUnarchive}
              disabled={unarchiveConfig.isPending}
            >
              {unarchiveConfig.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 rotate-180" />
              )}
              {t("teacher_interview_config.actions.unarchive")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteConfig.isPending}
            title={t("teacher_interview_config.actions.delete_tooltip")}
          >
            <Trash2 className="h-4 w-4" />
            {t("common.delete")}
          </Button>
        </div>
      </div>

      <SectionNav
        items={navItems}
        ariaLabel={t("teacher_interview_config.section_nav.aria_label")}
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6">
          {draft && (
            <>
              <section id="settings" className="scroll-mt-32">
                <SettingsForm
                  draft={draft}
                  setDraft={setDraft}
                  onSubmit={handleSaveSettings}
                  saving={updateConfig.isPending}
                  dirty={settingsDirty}
                  justSaved={justSaved}
                />
              </section>
              <section id="learning-outcomes" className="scroll-mt-32">
                <LearningOutcomes
                  configId={configId}
                  outcomes={outcomes ?? []}
                  questions={questions ?? []}
                  minOutcomesToPass={config.min_outcomes_to_pass ?? null}
                  onViewQuestions={handleViewOutcomeQuestions}
                />
              </section>
              <section id="generate" className="scroll-mt-32">
                <GenerationSection
                  generationForm={generationForm}
                  setGenerationForm={setGenerationForm}
                  onGenerate={handleGenerate}
                  generating={generate.isPending}
                  activeRunId={activeRunId}
                  run={activeRun}
                />
              </section>
              <section id="questions" className="scroll-mt-32">
                <QuestionBank
                  configId={configId}
                  questions={questions ?? []}
                  outcomes={outcomes ?? []}
                  outcomeFilterSignal={outcomeFilterSignal}
                />
              </section>
              <section id="adaptive-readiness" className="scroll-mt-32">
                <AdaptiveReadinessPanel configId={configId} />
              </section>
            </>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-m3-surface p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-headline font-bold text-base text-m3-on-surface">
                  {t("teacher_interview_config.confirm_delete.title")}
                </h2>
                <p className="text-sm text-m3-on-surface-variant">
                  {t("teacher_interview_config.confirm_delete.body", {
                    title: config.title,
                  })}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteConfig.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleteConfig.isPending}
                className="bg-red-600 text-white hover:bg-red-700 border-0 gap-2"
              >
                {deleteConfig.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
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
    typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : null;

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
        percent: target > 0 ? Math.round((Math.min(accepted, target) / target) * 100) : 100,
      };
    }
  }

  const live = cfg.progress as Record<string, unknown> | undefined;
  if (live) {
    const target = toInt(live.target);
    const accepted = toInt(live.accepted);
    const phaseRaw = live.phase;
    const phase =
      phaseRaw === "saving" || phaseRaw === "completed" ? phaseRaw : "generating";
    if (target !== null && accepted !== null) {
      return {
        phase,
        accepted,
        target,
        percent: target > 0 ? Math.round((Math.min(accepted, target) / target) * 100) : 0,
      };
    }
  }

  return null;
}

function SettingsForm({
  draft,
  setDraft,
  onSubmit,
  saving,
  dirty,
  justSaved,
}: {
  draft: SettingsDraft;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  onSubmit: (event: React.FormEvent) => void;
  saving: boolean;
  dirty: boolean;
  justSaved: boolean;
}) {
  const { t } = useTranslation();
  const [securityOpen, setSecurityOpen] = useState(false);
  function update<K extends keyof SettingsDraft>(
    key: K,
    value: SettingsDraft[K],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl p-6 lg:p-8 space-y-8 shadow-glass"
    >
      <Section
        title={t("teacher_interview_config.sections.general.title")}
        description={t(
          "teacher_interview_config.sections.general.description",
        )}
      >
        <Field label={t("teacher_interview_config.fields.title")}>
          <Input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={t(
              "teacher_interview_config.fields.title_placeholder",
            )}
            className="bg-m3-surface text-sm"
          />
        </Field>
      </Section>

      <Section title={t("teacher_interview_config.sections.style.title")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("teacher_interview_config.fields.persona")}>
            <select
              value={draft.persona}
              onChange={(e) => update("persona", e.target.value as Persona)}
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            >
              {PERSONA_KEYS.map((p) => (
                <option key={p} value={p}>
                  {t(`teacher_interview_config.persona.${p}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={t("teacher_interview_config.fields.mode")}
            hint={t("teacher_interview_config.fields.mode_hint")}
          >
            <select
              value={draft.supported_modes}
              onChange={(e) =>
                update("supported_modes", e.target.value as SupportedMode)
              }
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            >
              {MODE_KEYS.map((m) => (
                <option key={m} value={m}>
                  {t(`teacher_interview_config.mode.${m}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t("teacher_interview_config.sections.rules.title")}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label={t("teacher_interview_config.fields.duration_label")}
            hint={t("teacher_interview_config.fields.duration_hint")}
          >
            <Input
              type="number"
              min={1}
              max={180}
              value={draft.time_limit_minutes}
              onChange={(e) => update("time_limit_minutes", e.target.value)}
              placeholder="e.g. 30"
              className="bg-m3-surface text-sm"
            />
          </Field>
          <Field
            label={t("teacher_interview_config.fields.attempts_label")}
            hint={t("teacher_interview_config.fields.duration_hint")}
          >
            <Input
              type="number"
              min={1}
              value={draft.max_attempts}
              onChange={(e) => update("max_attempts", e.target.value)}
              placeholder="e.g. 3"
              className="bg-m3-surface text-sm"
            />
          </Field>
          <Field
            label={t("teacher_interview_config.fields.criteria_label")}
            hint={t("teacher_interview_config.fields.criteria_hint")}
          >
            <Input
              type="number"
              min={1}
              value={draft.min_outcomes_to_pass}
              onChange={(e) => update("min_outcomes_to_pass", e.target.value)}
              placeholder="e.g. 2"
              className="bg-m3-surface text-sm"
            />
          </Field>
        </div>

        <ToggleRow
          label={t("teacher_interview_config.fields.lock_ef_label")}
          description={t("teacher_interview_config.fields.lock_ef_desc")}
          value={draft.lock_quiz_ef_until_pass}
          onChange={(v) => update("lock_quiz_ef_until_pass", v)}
        />
      </Section>

      <Section
        title={t("teacher_interview_config.sections.guidance.title")}
        description={t(
          "teacher_interview_config.sections.guidance.description",
        )}
      >
        <Field
          label={t("teacher_interview_config.fields.supplementary_label")}
        >
          <textarea
            value={draft.supplementary_instructions}
            onChange={(e) =>
              update("supplementary_instructions", e.target.value)
            }
            rows={4}
            placeholder={t(
              "teacher_interview_config.fields.supplementary_placeholder",
            )}
            className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant/40 resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          />
        </Field>
      </Section>

      <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-4">
        <button
          type="button"
          aria-expanded={securityOpen}
          onClick={() => setSecurityOpen((open) => !open)}
          className="flex w-full cursor-pointer list-none items-center gap-3 text-left"
        >
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
        </button>

        <div
          className={`grid transition-all duration-300 ease-in-out ${
            securityOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
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
                    {t(`teacher_interview_config.security.protected.${item}`)}
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("teacher_interview_config.security.response_policy")}>
              <select
                value={draft.security_response_policy}
                onChange={(e) =>
                  update(
                    "security_response_policy",
                    e.target.value as SecurityResponsePolicy,
                  )
                }
                className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
              >
                {[
                  "continue_and_log",
                  "warn_and_continue",
                  "end_and_flag",
                ].map((policy) => (
                  <option key={policy} value={policy}>
                    {t(`teacher_interview_config.security.policy.${policy}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("teacher_interview_config.security.max_attempts")}>
              <Input
                type="number"
                min={2}
                max={20}
                value={draft.security_max_consecutive_attempts}
                onChange={(e) =>
                  update("security_max_consecutive_attempts", e.target.value)
                }
                className="bg-m3-surface text-sm"
              />
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label={t("teacher_interview_config.security.custom_en")}>
              <textarea
                rows={3}
                maxLength={500}
                value={draft.security_custom_refusal_en}
                onChange={(e) =>
                  update("security_custom_refusal_en", e.target.value)
                }
                className="w-full resize-none rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
              />
              <p className="mt-2 rounded-lg bg-m3-surface-container px-3 py-2 text-xs text-m3-on-surface-variant">
                {draft.security_custom_refusal_en.trim() ||
                  t("teacher_interview_config.security.preview_en")}
              </p>
            </Field>
            <Field label={t("teacher_interview_config.security.custom_vi")}>
              <textarea
                rows={3}
                maxLength={500}
                value={draft.security_custom_refusal_vi}
                onChange={(e) =>
                  update("security_custom_refusal_vi", e.target.value)
                }
                className="w-full resize-none rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
              />
              <p className="mt-2 rounded-lg bg-m3-surface-container px-3 py-2 text-xs text-m3-on-surface-variant">
                {draft.security_custom_refusal_vi.trim() ||
                  t("teacher_interview_config.security.preview_vi")}
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
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-m3-outline-variant/20">
        <p className="text-[11px] text-m3-on-surface-variant">
          {t("teacher_interview_config.actions.save_config_scope_hint")}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <SaveStatus saving={saving} dirty={dirty} justSaved={justSaved} />
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
}: {
  saving: boolean;
  dirty: boolean;
  justSaved: boolean;
}) {
  const { t } = useTranslation();
  if (saving) {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-m3-on-surface-variant"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        {t("teacher_interview_config.save_status.saving")}
      </span>
    );
  }
  if (dirty) {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700"
      >
        <span
          className="h-2 w-2 rounded-full bg-amber-500"
          aria-hidden="true"
        />
        {t("teacher_interview_config.save_status.unsaved")}
      </span>
    );
  }
  if (justSaved) {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        {t("teacher_interview_config.save_status.saved")}
      </span>
    );
  }
  return null;
}

function GenerationSection({
  generationForm,
  setGenerationForm,
  onGenerate,
  generating,
  activeRunId,
  run,
}: {
  generationForm: GenerationFormState;
  setGenerationForm: React.Dispatch<React.SetStateAction<GenerationFormState>>;
  onGenerate: () => void;
  generating: boolean;
  activeRunId: string | null;
  run: InterviewGenerationRunPublic | undefined;
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

  return (
    <div className="rounded-xl border-2 border-dashed border-m3-secondary/30 bg-m3-secondary/[0.03] p-6 lg:p-8 space-y-5">
      <Section
        title={t("teacher_interview_config.generate.section_title")}
        description={t("teacher_interview_config.generate.section_description")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("teacher_interview_config.generate.mode_label")}>
            <select
              value={generationForm.mode}
              onChange={(e) =>
                updateGeneration("mode", e.target.value as GenerationMode)
              }
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            >
              <option value="outcome-based">
                {t("teacher_interview_config.generate.mode_outcome")}
              </option>
              <option value="topic">
                {t("teacher_interview_config.generate.mode_topic")}
              </option>
              <option value="coverage">
                {t("teacher_interview_config.generate.mode_coverage")}
              </option>
            </select>
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
              className="bg-m3-surface text-sm"
            />
          </Field>
        </div>

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
            className="bg-m3-surface text-sm"
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
            className="bg-m3-surface text-sm"
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
            <div className="flex items-center gap-2 font-bold">
              {inProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : failed ? (
                <X className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {inProgress
                ? t("teacher_interview_config.generate.in_progress")
                : failed
                  ? t("teacher_interview_config.generate.failed")
                  : t("teacher_interview_config.generate.completed")}
              {progress && !failed && (
                <span className="ml-auto tabular-nums font-extrabold">
                  {progress.accepted}/{progress.target}
                </span>
              )}
            </div>

            {progress && !failed && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>
                    {completed
                      ? t("teacher_interview_config.generate.phase_done")
                      : progress.phase === "saving"
                        ? t("teacher_interview_config.generate.phase_saving")
                        : t("teacher_interview_config.generate.phase_generating")}
                  </span>
                  <span className="tabular-nums">{progress.percent}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-current/15">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500 ease-out",
                      completed ? "bg-emerald-500" : "bg-blue-500",
                    )}
                    style={{ width: `${Math.max(progress.percent, inProgress ? 6 : 0)}%` }}
                  />
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
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-m3-on-surface-variant">{hint}</p>}
    </div>
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
        <span
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-200",
            value ? "left-6 bg-surface-elev" : "left-1 bg-slate-400",
          )}
        />
      </button>
    </div>
  );
}
