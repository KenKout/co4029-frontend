import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  Save,
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
  useArchiveInterviewConfig,
  useCreateInterviewOutcome,
  useCreateInterviewQuestion,
  useDeleteInterviewConfig,
  useDeleteInterviewOutcome,
  useDeleteInterviewQuestion,
  useGenerateInterviewQuestions,
  useInterviewForAuthoring,
  useInterviewGenerationRun,
  usePublishInterviewConfig,
  useUnarchiveInterviewConfig,
  useUpdateInterviewConfig,
  useUpdateInterviewOutcome,
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
  InterviewOutcomeAuthoring,
  InterviewQuestionAuthoring,
} from "@/lib/api/types";
import { InterviewSessionsList } from "@/routes/teacher/interview-sessions-list";
import { cn } from "@/lib/utils";

type SupportedMode = NonNullable<InterviewConfigUpdate["supported_modes"]>;
type Persona = NonNullable<InterviewConfigUpdate["persona"]>;
type GenerationMode = InterviewGenerationRequest["mode"];

interface SettingsDraft {
  title: string;
  persona: Persona;
  supported_modes: SupportedMode;
  time_limit_minutes: string;
  max_attempts: string;
  min_outcomes_to_pass: string;
  lock_quiz_ef_until_pass: boolean;
  supplementary_instructions: string;
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
  const deleteConfig = useDeleteInterviewConfig(configId);

  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  useEffect(() => {
    if (config) setDraft(draftFromConfig(config));
  }, [config]);

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
    publishConfig.isPending || isPublished || approvedCount === 0;

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
      });
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
      if (
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
            onClick={() => setGenerationOpen(true)}
            className="gap-2 border-0 shadow-glass gradient-primary text-white hover:shadow-ai-glow"
          >
            <Sparkles className="h-4 w-4" />
            {t("teacher_interview_config.actions.generate_with_ai")}
          </Button>
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
              approvedCount === 0
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

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {draft && (
            <SettingsForm
              draft={draft}
              setDraft={setDraft}
              onSubmit={handleSaveSettings}
              saving={updateConfig.isPending}
            />
          )}
          <OutcomeList configId={configId} outcomes={outcomes ?? []} />
          <QuestionList
            configId={configId}
            questions={questions ?? []}
          />
          <InterviewSessionsList configId={configId} />
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div className="lg:sticky lg:top-6 space-y-4">
            <QuestionsSummaryCard
              draftCount={draftCount}
              approvedCount={approvedCount}
              importanceWeight={config.total_importance_weight}
              onGenerate={() => setGenerationOpen(true)}
            />
          </div>
        </div>
      </div>

      {generationOpen && (
        <GenerationModal
          configId={configId}
          courseId={courseId}
          moduleId={config.module_id}
          activeRunId={activeRunId}
          setActiveRunId={setActiveRunId}
          onClose={() => setGenerationOpen(false)}
        />
      )}

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

function SettingsForm({
  draft,
  setDraft,
  onSubmit,
  saving,
}: {
  draft: SettingsDraft;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  onSubmit: (event: React.FormEvent) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
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
          <Field label={t("teacher_interview_config.fields.mode")}>
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
              placeholder="VD: 30"
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
              placeholder="VD: 3"
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
              placeholder="VD: 2"
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
            className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          />
        </Field>
      </Section>

      <div className="flex justify-end gap-2 pt-4 border-t border-m3-outline-variant/20">
        <Button
          type="submit"
          disabled={saving}
          className="gap-2 gradient-primary text-white border-0 hover:shadow-ai-glow"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t("teacher_interview_config.actions.save_config")}
        </Button>
      </div>
    </form>
  );
}

function QuestionsSummaryCard({
  draftCount,
  approvedCount,
  importanceWeight,
  onGenerate,
}: {
  draftCount: number;
  approvedCount: number;
  importanceWeight: number | null | undefined;
  onGenerate: () => void;
}) {
  const { t } = useTranslation();
  const pendingCount = Math.max(0, draftCount - approvedCount);
  return (
    <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-5 shadow-glass space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow shrink-0">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-headline font-bold text-sm text-m3-on-surface">
            {t("teacher_interview_config.questions.section_title")}
          </h3>
          <p className="text-[11px] text-m3-on-surface-variant">
            {t("teacher_interview_config.questions.section_description")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-m3-surface-container-low p-3">
          <p className="text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-widest">
            {t("teacher_interview_config.questions.count_label")}
          </p>
          <p className="text-2xl font-extrabold font-headline text-m3-primary mt-1">
            {draftCount}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-widest">
            {t("teacher_interview_config.questions.approved_label")}
          </p>
          <p className="text-2xl font-extrabold font-headline text-emerald-700 mt-1">
            {approvedCount}
          </p>
        </div>
        <div className="rounded-xl bg-m3-surface-container-low p-3">
          <p className="text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-widest">
            {t("teacher_interview_config.questions.weight_total")}
          </p>
          <p className="text-2xl font-extrabold font-headline text-m3-on-surface mt-1">
            {importanceWeight == null
              ? "—"
              : Number(importanceWeight).toFixed(1)}
          </p>
        </div>
      </div>

      <Button
        type="button"
        onClick={onGenerate}
        className="w-full gap-2 gradient-primary text-white border-0 hover:shadow-ai-glow"
      >
        <Sparkles className="h-4 w-4" />
        {t("teacher_interview_config.questions.open_generator")}
      </Button>

      {draftCount === 0 && (
        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 leading-relaxed">
          {t("teacher_interview_config.questions.empty")}
        </p>
      )}
      {draftCount > 0 && approvedCount === 0 && (
        <p className="text-[11px] text-amber-800 bg-amber-50 rounded-xl px-3 py-2 leading-relaxed">
          {t("teacher_interview_config.questions.none_approved")}
        </p>
      )}
      {pendingCount > 0 && (
        <p className="text-[11px] text-m3-on-surface-variant bg-m3-surface-container-low rounded-xl px-3 py-2 leading-relaxed">
          {t("teacher_interview_config.questions.pending_hint", { count: pendingCount })}
        </p>
      )}
    </div>
  );
}

function GenerationModal({
  configId,
  courseId,
  moduleId,
  activeRunId,
  setActiveRunId,
  onClose,
}: {
  configId: string;
  courseId: string;
  moduleId: string;
  activeRunId: string | null;
  setActiveRunId: (runId: string | null) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const generate = useGenerateInterviewQuestions(configId);
  const { data: run } = useInterviewGenerationRun(configId, activeRunId);

  useEffect(() => {
    if (run?.status === "completed") {
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.configAuthoring(configId),
      });
    }
  }, [run?.status, configId, qc]);

  const [form, setForm] = useState({
    mode: "outcome-based" as GenerationMode,
    question_count: 5,
    focus_topics: "",
    avoid_topics: "",
    persona: "neutral" as Persona,
    supplementary_instructions: "",
  });

  const inProgress =
    generate.isPending ||
    Boolean(
      activeRunId &&
        (!run || run.status === "pending" || run.status === "running"),
    );
  const failed = run?.status === "failed";
  const completed = run?.status === "completed";

  function splitTopics(value: string): string[] {
    return value
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    if (!Number.isInteger(form.question_count) || form.question_count < 1) {
      toast.error(t("teacher_interview_config.errors.question_count_min"));
      return;
    }
    try {
      const result = await generate.mutateAsync({
        mode: form.mode,
        course_id: courseId,
        module_id: moduleId,
        question_count: form.question_count,
        focus_topics: splitTopics(form.focus_topics),
        avoid_topics: splitTopics(form.avoid_topics),
        source_lesson_ids: [],
        persona: form.persona,
        supplementary_instructions:
          form.supplementary_instructions.trim() || null,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-m3-surface shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-3 border-b border-m3-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-headline font-bold text-base text-m3-on-surface">
                {t("teacher_interview_config.actions.generate_with_ai")}
              </h2>
              <p className="text-xs text-m3-on-surface-variant">
                {t("teacher_interview_config.generate_modal.description")}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleGenerate} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("teacher_interview_config.generate.mode_label")}>
              <select
                value={form.mode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    mode: e.target.value as GenerationMode,
                  }))
                }
                className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
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
                value={form.question_count}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    // Keep the raw numeric value (0 allowed transiently) so the
                    // submit-time guard can surface a "must be > 0" error rather
                    // than silently coercing the teacher's input.
                    question_count: Math.floor(Number(e.target.value)) || 0,
                  }))
                }
                className="bg-m3-surface-container-low text-sm"
              />
            </Field>
          </div>

          <Field label={t("teacher_interview_config.fields.persona")}>
            <select
              value={form.persona}
              onChange={(e) =>
                setForm((f) => ({ ...f, persona: e.target.value as Persona }))
              }
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            >
              {PERSONA_KEYS.map((p) => (
                <option key={p} value={p}>
                  {t(`teacher_interview_config.persona.${p}`)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={t("teacher_interview_config.generate.focus_label")}
            hint={t("teacher_interview_config.generate.focus_hint")}
          >
            <Input
              value={form.focus_topics}
              onChange={(e) =>
                setForm((f) => ({ ...f, focus_topics: e.target.value }))
              }
              placeholder={t(
                "teacher_interview_config.generate.focus_placeholder",
              )}
              className="bg-m3-surface-container-low text-sm"
            />
          </Field>

          <Field
            label={t("teacher_interview_config.generate.avoid_label")}
            hint={t("teacher_interview_config.generate.avoid_hint")}
          >
            <Input
              value={form.avoid_topics}
              onChange={(e) =>
                setForm((f) => ({ ...f, avoid_topics: e.target.value }))
              }
              placeholder={t(
                "teacher_interview_config.generate.avoid_placeholder",
              )}
              className="bg-m3-surface-container-low text-sm"
            />
          </Field>

          <Field
            label={t("teacher_interview_config.fields.supplementary_label")}
          >
            <textarea
              value={form.supplementary_instructions}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  supplementary_instructions: e.target.value,
                }))
              }
              rows={3}
              placeholder={t(
                "teacher_interview_config.generate.supplementary_placeholder",
              )}
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            />
          </Field>

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
              </div>
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

          <div className="flex justify-end gap-2 pt-2 border-t border-m3-outline-variant/20">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.close")}
            </Button>
            <Button
              type="submit"
              disabled={inProgress}
              className="gap-2 gradient-primary text-white border-0 hover:shadow-ai-glow"
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
        </form>
      </div>
    </div>
  );
}

const _OUTCOME_TYPES = ["knowledge", "skill", "attitude"] as const;

function OutcomeList({
  configId,
  outcomes,
}: {
  configId: string;
  outcomes: InterviewOutcomeAuthoring[];
}) {
  const { t } = useTranslation();
  const createOutcome = useCreateInterviewOutcome(configId);
  const updateOutcome = useUpdateInterviewOutcome(configId);
  const deleteOutcome = useDeleteInterviewOutcome(configId);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newType, setNewType] =
    useState<InterviewOutcomeAuthoring["outcome_type"]>("knowledge");
  const [newWeight, setNewWeight] = useState(3);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const sorted = useMemo(
    () => [...outcomes].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [outcomes],
  );

  async function handleAdd() {
    if (!newText.trim()) return;
    try {
      await createOutcome.mutateAsync({
        position: sorted.length + 1,
        outcome_text: newText.trim(),
        outcome_type: newType,
        importance_weight: newWeight,
      });
      setNewText("");
      setNewType("knowledge");
      setNewWeight(3);
      setAdding(false);
      toast.success(t("teacher_interview_config.outcomes.added"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  async function handleSaveEdit() {
    if (!editingId || !editingText.trim()) return;
    try {
      await updateOutcome.mutateAsync({
        outcomeId: editingId,
        patch: { outcome_text: editingText.trim() },
      });
      setEditingId(null);
      setEditingText("");
      toast.success(t("teacher_interview_config.outcomes.saved"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  async function handleDelete(o: InterviewOutcomeAuthoring) {
    try {
      await deleteOutcome.mutateAsync(o.id);
      toast.success(t("teacher_interview_config.outcomes.deleted"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl p-6 lg:p-8 space-y-4 shadow-glass">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-headline font-extrabold text-base text-m3-on-surface">
            {t("teacher_interview_config.outcomes.list_title")}
          </h3>
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            {t("teacher_interview_config.outcomes.list_description")}
          </p>
        </div>
        {!adding && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setAdding(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("teacher_interview_config.outcomes.add")}
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3 space-y-2">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={2}
            placeholder={t("teacher_interview_config.outcomes.add_placeholder")}
            className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={newType}
              onChange={(e) =>
                setNewType(
                  e.target.value as InterviewOutcomeAuthoring["outcome_type"],
                )
              }
              className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            >
              {_OUTCOME_TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {t(`teacher_interview_config.outcomes.type_${tp}`)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
              {t("teacher_interview_config.outcomes.weight_label")}
              <input
                type="number"
                min={1}
                max={5}
                value={newWeight}
                onChange={(e) =>
                  setNewWeight(
                    Math.min(5, Math.max(1, Math.floor(Number(e.target.value)) || 1)),
                  )
                }
                className="w-16 rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
              />
            </label>
            <div className="flex justify-end gap-2 ml-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setNewText("");
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                disabled={createOutcome.isPending || !newText.trim()}
                onClick={() => void handleAdd()}
                className="gap-2"
              >
                {createOutcome.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {t("teacher_interview_config.outcomes.add_save")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 leading-relaxed">
          {t("teacher_interview_config.outcomes.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((o) => {
            const isEditing = editingId === o.id;
            return (
              <li
                key={o.id}
                className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditingText("");
                        }}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        type="button"
                        disabled={updateOutcome.isPending || !editingText.trim()}
                        onClick={() => void handleSaveEdit()}
                        className="gap-2"
                      >
                        {updateOutcome.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        <Save className="h-4 w-4" />
                        {t("common.save")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm text-m3-on-surface leading-relaxed">
                        {o.outcome_text}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border-0 bg-m3-surface-container text-m3-on-surface-variant text-[10px] font-bold rounded-full px-2 py-0.5">
                          {t(
                            `teacher_interview_config.outcomes.type_${o.outcome_type}`,
                          )}
                        </Badge>
                        <span className="text-[10px] text-m3-on-surface-variant">
                          {t("teacher_interview_config.outcomes.weight_badge", {
                            weight: o.importance_weight,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingId(o.id);
                          setEditingText(o.outcome_text);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-600"
                        disabled={deleteOutcome.isPending}
                        onClick={() => void handleDelete(o)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function QuestionList({
  configId,
  questions,
}: {
  configId: string;
  questions: InterviewQuestionAuthoring[];
}) {
  const { t } = useTranslation();
  const updateQuestion = useUpdateInterviewQuestion(configId);
  const deleteQuestion = useDeleteInterviewQuestion(configId);
  const createQuestion = useCreateInterviewQuestion(configId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const sorted = useMemo(
    () => [...questions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [questions],
  );

  async function handleApprove(q: InterviewQuestionAuthoring) {
    try {
      await updateQuestion.mutateAsync({
        questionId: q.id,
        patch: { review_status: "approved" },
      });
      toast.success(t("teacher_interview_config.toasts.question_approved"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.question_approve_failed"),
      );
    }
  }

  async function handleReject(q: InterviewQuestionAuthoring) {
    try {
      await updateQuestion.mutateAsync({
        questionId: q.id,
        patch: { review_status: "rejected" },
      });
      toast.success(t("teacher_interview_config.toasts.question_rejected"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  async function handleSaveEdit() {
    if (!editingId || !editingText.trim()) return;
    try {
      await updateQuestion.mutateAsync({
        questionId: editingId,
        patch: { prompt_text: editingText.trim() },
      });
      setEditingId(null);
      setEditingText("");
      toast.success(t("teacher_interview_config.toasts.question_saved"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  async function handleDelete(q: InterviewQuestionAuthoring) {
    try {
      await deleteQuestion.mutateAsync(q.id);
      toast.success(t("teacher_interview_config.toasts.question_deleted"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  async function handleAdd() {
    if (!newText.trim()) return;
    try {
      await createQuestion.mutateAsync({
        prompt_text: newText.trim(),
        question_type: "conceptual",
      });
      setNewText("");
      setAdding(false);
      toast.success(t("teacher_interview_config.toasts.question_added"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl p-6 lg:p-8 space-y-4 shadow-glass">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-headline font-extrabold text-base text-m3-on-surface">
            {t("teacher_interview_config.questions.list_title")}
          </h3>
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            {t("teacher_interview_config.questions.list_description")}
          </p>
        </div>
        {!adding && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setAdding(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("teacher_interview_config.questions.add_manual")}
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3 space-y-2">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={3}
            placeholder={t(
              "teacher_interview_config.questions.add_placeholder",
            )}
            className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setNewText("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={createQuestion.isPending || !newText.trim()}
              onClick={() => void handleAdd()}
              className="gap-2"
            >
              {createQuestion.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {t("teacher_interview_config.questions.add_save")}
            </Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 leading-relaxed">
          {t("teacher_interview_config.questions.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((q) => {
            const isEditing = editingId === q.id;
            const badgeClass =
              q.review_status === "approved"
                ? "bg-emerald-100 text-emerald-700"
                : q.review_status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-50 text-amber-700";
            return (
              <li
                key={q.id}
                className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  {isEditing ? (
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={3}
                      className="flex-1 rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
                    />
                  ) : (
                    <p className="text-sm text-m3-on-surface flex-1 whitespace-pre-wrap leading-relaxed">
                      {q.prompt_text}
                    </p>
                  )}
                  <Badge
                    className={cn(
                      "border-0 text-[10px] font-bold uppercase tracking-widest shrink-0",
                      badgeClass,
                    )}
                  >
                    {t(`teacher_interview_config.review_status.${q.review_status}`)}
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-1 flex-wrap">
                  {isEditing ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditingText("");
                        }}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={updateQuestion.isPending || !editingText.trim()}
                        onClick={() => void handleSaveEdit()}
                        className="gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {t("common.save")}
                      </Button>
                    </>
                  ) : (
                    <>
                      {q.review_status !== "approved" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={updateQuestion.isPending}
                          onClick={() => void handleApprove(q)}
                          className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t("teacher_interview_config.questions.approve")}
                        </Button>
                      )}
                      {q.review_status === "approved" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={updateQuestion.isPending}
                          onClick={() => void handleReject(q)}
                          className="gap-1.5"
                        >
                          <X className="h-3.5 w-3.5" />
                          {t("teacher_interview_config.questions.reject")}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(q.id);
                          setEditingText(q.prompt_text);
                        }}
                        className="gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t("common.edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deleteQuestion.isPending}
                        onClick={() => void handleDelete(q)}
                        className="gap-1.5 text-red-700 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("common.delete")}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
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