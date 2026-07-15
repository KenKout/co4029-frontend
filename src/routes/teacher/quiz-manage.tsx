import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  HelpCircle,
  Loader2,
  Plus,
  RefreshCw,
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
import { ApiError } from "@/lib/api/client";
import {
  useAddQuizQuestion,
  useBulkSetExpectedTime,
  useDeleteQuiz,
  usePatchQuiz,
  usePublishQuiz,
  useQuizAuthoring,
  useRegenerateQuestion,
  useUpdateQuizQuestion,
  usePendingQuestionDeletes,
  type PendingQuestionDelete,
} from "@/lib/api/hooks/quizzes";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/teacher-courses";
import type {
  QuizAuthoring,
  QuizQuestionAuthoring,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { QuizGenerationPanel } from "./_components/quiz-generation-panel";
import { QuestionBankModal } from "./_components/question-bank-modal";

type TabKey = "questions" | "settings" | "preview";

const TAB_KEYS: ReadonlyArray<TabKey> = ["questions", "settings", "preview"];

interface SettingsDraft {
  title: string;
  description: string;
  time_limit_minutes: string;
  passing_score_percent: number;
  max_attempts: string;
  cooldown_hours: string;
  initial_ef: string;
  min_ef_for_unlock: string;
  coverage_threshold: string;
  allow_retakes: boolean;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_hints: boolean;
  reminders_enabled: boolean;
}

function toDraftString(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

function integerOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function decimalOrNull(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number.isFinite(Number(trimmed)) ? trimmed : null;
}

function draftFromQuiz(quiz: QuizAuthoring): SettingsDraft {
  const passingNum = Number(quiz.passing_score_percent ?? 70);
  return {
    title: quiz.title ?? "",
    description: quiz.description ?? "",
    time_limit_minutes:
      quiz.time_limit_seconds == null
        ? ""
        : String(Math.max(1, Math.round(quiz.time_limit_seconds / 60))),
    passing_score_percent: Number.isFinite(passingNum)
      ? Math.max(0, Math.min(100, Math.round(passingNum)))
      : 70,
    max_attempts: toDraftString(quiz.max_attempts),
    cooldown_hours: toDraftString(quiz.cooldown_hours),
    initial_ef: toDraftString(quiz.initial_ef),
    min_ef_for_unlock: toDraftString(quiz.min_ef_for_unlock),
    coverage_threshold: toDraftString(quiz.coverage_threshold),
    allow_retakes: quiz.allow_retakes,
    shuffle_questions: quiz.shuffle_questions,
    shuffle_options: quiz.shuffle_options,
    show_hints: quiz.show_hints,
    reminders_enabled: quiz.reminders_enabled,
  };
}

export default function QuizManagePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId, quizId } = useParams({ strict: false }) as {
    courseId: string;
    quizId: string;
  };

  const { data: course } = useTeacherCourseById(courseId);
  const { data: authoring, isLoading: authoringLoading } =
    useQuizAuthoring(quizId);
  const { data: content, isLoading: contentLoading } =
    useTeacherCourseContent(courseId);

  const quiz = authoring?.quiz;
  const allQuestions = useMemo(() => authoring?.questions ?? [], [authoring]);

  // Combo-undo: deletes are deferred 5s so rapid deletes stack into one
  // batch that a single Undo can revert. Staged questions are hidden from
  // the list immediately but only sent to the server when the timer expires.
  const pendingDeletes = usePendingQuestionDeletes(quizId);
  const questions = useMemo(
    () => allQuestions.filter((q) => !pendingDeletes.pendingIds.has(q.id)),
    [allQuestions, pendingDeletes.pendingIds],
  );

  const courseModule = useMemo(
    () => content?.modules.find((entry) => entry.id === quiz?.module_id),
    [content, quiz?.module_id],
  );

  const deleteQuiz = useDeleteQuiz(quizId);
  const publishQuiz = usePublishQuiz(quizId);
  const patchQuiz = usePatchQuiz(quizId);
  const addQuestion = useAddQuizQuestion(quizId);

  const [tab, setTab] = useState<TabKey>("questions");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkSeconds, setBulkSeconds] = useState<string>("60");

  useEffect(() => {
    if (quiz) setDraft(draftFromQuiz(quiz));
  }, [quiz]);

  useEffect(() => {
    setSelectedQuestionIds((current) => {
      const valid = new Set(questions.map((q) => q.id));
      const next = new Set<string>();
      current.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next.size === current.size ? current : next;
    });
  }, [questions]);

  if (authoringLoading || contentLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (!quiz || !courseModule) {
    return (
      <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
            <HelpCircle className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="font-headline font-bold text-m3-on-surface">
            {t("teacher_quiz_manage.errors.not_found_title")}
          </p>
          <p className="text-sm mt-1">
            {t("teacher_quiz_manage.errors.not_found_description")}
          </p>
        </div>
        <Link to="/teacher/courses/$courseId" params={{ courseId }} className="inline-flex">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("teacher_quiz_manage.errors.back_to_course")}
          </Button>
        </Link>
      </div>
    );
  }

  const moduleId = courseModule.id;
  const isPublished = quiz.status === "published";
  const publishDisabled =
    publishQuiz.isPending || isPublished || questions.length === 0;

  function returnToModule() {
    void navigate({
      to: "/teacher/courses/$courseId/modules/$moduleId",
      params: { courseId, moduleId },
    });
  }

  async function handleDelete() {
    try {
      await deleteQuiz.mutateAsync();
      toast.success(t("teacher_quiz_manage.toasts.deleted"));
      returnToModule();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_quiz_manage.toasts.delete_failed"),
      );
    } finally {
      setConfirmDelete(false);
    }
  }

  async function handlePublish() {
    if (publishDisabled) return;
    try {
      await publishQuiz.mutateAsync();
      toast.success(t("teacher_quiz_manage.toasts.published"));
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        err.status === 422 &&
        (err.code === "missing_t_exp" ||
          err.code === "missing_expected_response_time" ||
          err.code === "missing_expected_time")
      ) {
        return;
      }
      toast.error(
        (err as Error).message || t("teacher_quiz_manage.toasts.publish_failed"),
      );
    }
  }

  async function handleAddQuestion() {
    try {
      await addQuestion.mutateAsync({
        question_type: "multiple_choice",
        prompt_text: t("teacher_quiz_manage.new_question.prompt"),
        explanation: t("teacher_quiz_manage.new_question.explanation"),
        difficulty: "medium",
        bloom_level: "understand",
        options: [
          {
            option_key: "A",
            option_text: t("teacher_quiz_manage.new_question.option_a"),
            is_correct: true,
          },
          {
            option_key: "B",
            option_text: t("teacher_quiz_manage.new_question.option_b"),
            is_correct: false,
          },
          {
            option_key: "C",
            option_text: t("teacher_quiz_manage.new_question.option_c"),
            is_correct: false,
          },
          {
            option_key: "D",
            option_text: t("teacher_quiz_manage.new_question.option_d"),
            is_correct: false,
          },
        ],
      });
      toast.success(t("teacher_quiz_manage.toasts.question_added"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.add_question_failed"),
      );
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error(t("teacher_quiz_manage.errors.title_required"));
      return;
    }
    const minutesRaw = draft.time_limit_minutes.trim();
    const timeLimitSeconds = minutesRaw
      ? Math.max(0, Math.round(Number(minutesRaw) * 60))
      : null;
    try {
      await patchQuiz.mutateAsync({
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        time_limit_seconds: timeLimitSeconds,
        passing_score_percent: String(draft.passing_score_percent),
        max_attempts: integerOrNull(draft.max_attempts),
        cooldown_hours: integerOrNull(draft.cooldown_hours),
        initial_ef: decimalOrNull(draft.initial_ef),
        min_ef_for_unlock: decimalOrNull(draft.min_ef_for_unlock),
        coverage_threshold: decimalOrNull(draft.coverage_threshold),
        allow_retakes: draft.allow_retakes,
        shuffle_questions: draft.shuffle_questions,
        shuffle_options: draft.shuffle_options,
        show_hints: draft.show_hints,
        reminders_enabled: draft.reminders_enabled,
      });
      toast.success(t("teacher_quiz_manage.toasts.settings_saved"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.save_settings_failed"),
      );
    }
  }

  function toggleQuestionSelection(id: string) {
    setSelectedQuestionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllQuestions() {
    setSelectedQuestionIds(new Set(questions.map((q) => q.id)));
  }

  function clearSelection() {
    setSelectedQuestionIds(new Set());
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1500px] mx-auto">
      <Breadcrumbs
        items={[
          { label: t("teacher_common.breadcrumb_teaching"), to: "/teacher/courses" },
          {
            label: course?.title ?? t("teacher_common.breadcrumb_course"),
            to: "/teacher/courses/$courseId",
            params: { courseId },
          },
          {
            label: courseModule.title,
            to: "/teacher/courses/$courseId/modules/$moduleId",
            params: { courseId, moduleId },
          },
          { label: quiz.title },
        ]}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link
            to="/teacher/courses/$courseId/modules/$moduleId"
            params={{ courseId, moduleId }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 mt-1 shrink-0"
              title={t("teacher_quiz_manage.actions.back_to_module")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-gradient-primary leading-tight">
              {quiz.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-m3-outline-variant/30 bg-m3-surface-container-low text-m3-on-surface-variant rounded-full text-[11px] font-bold px-2.5 py-1">
                {t("teacher_quiz_manage.header.questions_count", {
                  count: questions.length,
                })}
              </Badge>
              {isPublished ? (
                <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[11px] font-bold gap-1.5 rounded-full px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("teacher_quiz_manage.status.published")}
                </Badge>
              ) : (
                <Badge className="border-0 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full px-2.5 py-1">
                  {t("teacher_quiz_manage.status.draft")}
                </Badge>
              )}
              <AIInsightChip>AI Quiz Editor</AIInsightChip>
            </div>
            {quiz.description && (
              <p className="text-sm text-m3-on-surface-variant max-w-2xl leading-relaxed">
                {quiz.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {course?.slug && (
            <Link
              to="/courses/$slug/quiz/$quizId"
              params={{ slug: course.slug, quizId }}
            >
              <Button variant="outline" className="gap-2" type="button">
                <Eye className="h-4 w-4" />
                {t("teacher_quiz_manage.actions.view_as_student")}
              </Button>
            </Link>
          )}
          <Button
            type="button"
            disabled={publishDisabled}
            onClick={handlePublish}
            className={cn(
              "gap-2 border-0 shadow-glass",
              isPublished
                ? "bg-emerald-600 text-white hover:bg-emerald-600 cursor-default"
                : "gradient-primary text-white hover:shadow-ai-glow",
            )}
            title={
              questions.length === 0
                ? t("teacher_quiz_manage.actions.publish_needs_question")
                : isPublished
                  ? t("teacher_quiz_manage.status.published")
                  : t("teacher_quiz_manage.actions.publish_quiz_tooltip")
            }
          >
            {publishQuiz.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPublished ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isPublished
              ? t("teacher_quiz_manage.status.published")
              : t("teacher_quiz_manage.actions.publish")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteQuiz.isPending}
            title={t("teacher_quiz_manage.actions.delete_quiz_tooltip")}
          >
            <Trash2 className="h-4 w-4" />
            {t("common.delete")}
          </Button>
        </div>
      </div>

      <div className="bg-m3-surface-container-low rounded-xl p-1 inline-flex gap-1 border border-m3-outline-variant/20 shadow-glass">
        {TAB_KEYS.map((key) => {
          const active = key === tab;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={active}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer",
                active
                  ? "bg-surface-elev text-m3-primary shadow-sm"
                  : "text-m3-on-surface-variant hover:text-m3-primary/80",
              )}
            >
              {t(`teacher_quiz_manage.tabs.${key}`)}
            </button>
          );
        })}
      </div>

      {tab === "questions" && (
        <QuestionsTab
          quizId={quizId}
          questions={questions}
          selectedIds={selectedQuestionIds}
          onToggleSelect={toggleQuestionSelection}
          onSelectAll={selectAllQuestions}
          onClearSelection={clearSelection}
          bulkSeconds={bulkSeconds}
          onBulkSecondsChange={setBulkSeconds}
          onAddQuestion={handleAddQuestion}
          addPending={addQuestion.isPending}
          onOpenGenerator={() => setShowGenerateModal(true)}
          onOpenBank={() => setShowBankModal(true)}
          onQueueDelete={pendingDeletes.queueDelete}
          comboCount={pendingDeletes.comboCount}
          comboSecondsLeft={pendingDeletes.secondsLeft}
          onUndoDeletes={pendingDeletes.undo}
        />
      )}

      {tab === "settings" && draft && (
        <SettingsTab
          draft={draft}
          setDraft={setDraft}
          onSubmit={handleSaveSettings}
          saving={patchQuiz.isPending}
        />
      )}

      {tab === "preview" && (
        <PreviewTab quiz={quiz} questions={questions} />
      )}

      {showGenerateModal && quiz?.module_id && (
        <GenerateModal
          quizId={quizId}
          moduleId={quiz.module_id}
          hasExistingQuestions={questions.length > 0}
          onClose={() => setShowGenerateModal(false)}
        />
      )}

      {showBankModal && quiz?.course_id && (
        <QuestionBankModal
          courseId={quiz.course_id}
          quizId={quizId}
          defaultModuleId={quiz.module_id}
          onClose={() => setShowBankModal(false)}
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
                  {t("teacher_quiz_manage.confirm_delete.title")}
                </h2>
                <p className="text-sm text-m3-on-surface-variant">
                  {t("teacher_quiz_manage.confirm_delete.body")}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteQuiz.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleteQuiz.isPending}
                className="bg-red-600 text-white hover:bg-red-700 border-0 gap-2"
              >
                {deleteQuiz.isPending ? (
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

function QuestionsTab({
  quizId,
  questions,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  bulkSeconds,
  onBulkSecondsChange,
  onAddQuestion,
  addPending,
  onOpenGenerator,
  onOpenBank,
  onQueueDelete,
  comboCount,
  comboSecondsLeft,
  onUndoDeletes,
}: {
  quizId: string;
  questions: QuizQuestionAuthoring[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  bulkSeconds: string;
  onBulkSecondsChange: (value: string) => void;
  onAddQuestion: () => void | Promise<void>;
  addPending: boolean;
  onOpenGenerator: () => void;
  onOpenBank: () => void;
  onQueueDelete: (item: PendingQuestionDelete) => void;
  comboCount: number;
  comboSecondsLeft: number;
  onUndoDeletes: () => void;
}) {
  const { t } = useTranslation();
  const bulkSet = useBulkSetExpectedTime(quizId);
  const pendingCount = questions.filter(
    (q) => q.review_status !== "approved",
  ).length;

  const missingExpectedTimeCount = questions.filter(
    (q) =>
      q.expected_response_time_ms == null || q.expected_response_time_ms <= 0,
  ).length;

  const secondsValue = Number(bulkSeconds);
  const bulkValid =
    selectedIds.size > 0 &&
    Number.isFinite(secondsValue) &&
    secondsValue > 0;

  async function handleApplyBulk() {
    try {
      const result = await bulkSet.mutateAsync({
        question_ids: Array.from(selectedIds),
        expected_seconds: secondsValue,
      });
      toast.success(
        t("teacher_quiz_manage.toasts.expected_time_set", {
          count: result.updated,
        }),
      );
      onClearSelection();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.expected_time_failed"),
      );
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-8 space-y-4">
        {/* Undo snackbar: fixed bottom-center so it's ALWAYS visible
            regardless of scroll position. It must NOT be a sticky element
            inside the list — a sticky banner would slide under the global
            ContentTopBar (z-20 per frontend/AGENTS.md) and be invisible,
            which is exactly what happened. z-30 keeps it above page
            content and the top bar but below the sidebar (z-40). */}
        {comboCount > 0 && (
          <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 flex items-center gap-3 rounded-xl bg-m3-inverse-surface text-m3-inverse-on-surface px-4 py-3 shadow-lg max-w-[calc(100vw-2rem)]">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <svg className="absolute inset-0 h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  strokeWidth="3"
                  className="stroke-white/20"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="stroke-current text-m3-primary transition-[stroke-dashoffset] duration-300 ease-linear"
                  strokeDasharray={2 * Math.PI * 14}
                  strokeDashoffset={
                    2 * Math.PI * 14 * (1 - comboSecondsLeft / 5)
                  }
                />
              </svg>
              <span className="text-sm font-bold tabular-nums">
                {comboSecondsLeft}
              </span>
            </div>
            <span className="flex-1 text-sm font-medium whitespace-nowrap">
              {t("teacher_quiz_manage.combo_undo.message", {
                count: comboCount,
              })}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onUndoDeletes}
              className="gap-2 border-white/30 bg-transparent text-m3-inverse-on-surface hover:bg-white/10 hover:text-m3-inverse-on-surface shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("teacher_quiz_manage.combo_undo.undo", { count: comboCount })}
            </Button>
          </div>
        )}

        {questions.length > 0 && missingExpectedTimeCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {t("teacher_quiz_manage.banners.missing_expected_time", {
                count: missingExpectedTimeCount,
              })}
            </span>
          </div>
        )}

        {questions.length > 0 && pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-900">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {t("teacher_quiz_manage.banners.pending_review", {
                count: pendingCount,
              })}
            </span>
          </div>
        )}

        <BulkSetExpectedTimeBar
          totalQuestions={questions.length}
          selectedCount={selectedIds.size}
          bulkSeconds={bulkSeconds}
          onBulkSecondsChange={onBulkSecondsChange}
          onSelectAll={onSelectAll}
          onClear={onClearSelection}
          onApply={handleApplyBulk}
          applyValid={bulkValid}
          applying={bulkSet.isPending}
        />

        {questions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-m3-outline-variant/30 bg-m3-surface-container-lowest p-10 text-center space-y-3">
            <HelpCircle className="h-10 w-10 text-m3-outline-variant mx-auto" />
            <div>
              <p className="font-headline font-bold text-m3-on-surface">
                {t("teacher_quiz_manage.empty.no_questions_title")}
              </p>
              <p className="text-sm text-m3-on-surface-variant mt-1 max-w-md mx-auto">
                {t("teacher_quiz_manage.empty.no_questions_body")}
              </p>
            </div>
          </div>
        ) : (
          questions.map((question) => (
            <QuestionCard
              key={question.id}
              quizId={quizId}
              question={question}
              selected={selectedIds.has(question.id)}
              onToggleSelect={() => onToggleSelect(question.id)}
              onQueueDelete={onQueueDelete}
            />
          ))
        )}

        <button
          type="button"
          onClick={onAddQuestion}
          disabled={addPending}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-m3-outline-variant/40 rounded-xl px-6 py-4 text-sm font-bold text-m3-on-surface-variant hover:border-m3-primary hover:text-m3-primary hover:bg-m3-primary/5 transition-all disabled:opacity-60 cursor-pointer"
        >
          {addPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t("teacher_quiz_manage.actions.add_question")}
        </button>
      </div>

      <div className="col-span-12 lg:col-span-4">
        <div className="lg:sticky lg:top-6 space-y-4">
          <div className="rounded-xl border border-m3-secondary/10 bg-m3-surface-container-low p-5 shadow-glass space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-headline font-bold text-sm text-m3-on-surface">
                  {t("teacher_quiz_manage.ai_panel.title")}
                </h2>
                <p className="text-xs text-m3-on-surface-variant">
                  {t("teacher_quiz_manage.ai_panel.description")}
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={onOpenGenerator}
              className="w-full gap-2 gradient-primary text-white border-0 shadow-ai-glow"
            >
              <Sparkles className="h-4 w-4" />
              {t("teacher_quiz_manage.ai_panel.open_generator")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onOpenBank}
              className="w-full gap-2"
            >
              <BookOpen className="h-4 w-4" />
              {t("teacher_quiz_manage.ai_panel.import_from_bank", "Import from bank")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkSetExpectedTimeBar({
  totalQuestions,
  selectedCount,
  bulkSeconds,
  onBulkSecondsChange,
  onSelectAll,
  onClear,
  onApply,
  applyValid,
  applying,
}: {
  totalQuestions: number;
  selectedCount: number;
  bulkSeconds: string;
  onBulkSecondsChange: (value: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onApply: () => void | Promise<void>;
  applyValid: boolean;
  applying: boolean;
}) {
  const { t } = useTranslation();
  if (totalQuestions === 0) return null;
  return (
    <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-4 flex flex-wrap items-center gap-3 shadow-glass">
      <div className="flex items-center gap-2 text-sm text-m3-on-surface">
        <Clock className="h-4 w-4 text-m3-secondary" />
        <span className="font-bold">
          {t("teacher_quiz_manage.bulk_time.title")}
        </span>
        <Badge className="border-0 bg-m3-surface-container-high text-m3-on-surface text-[11px] font-bold rounded-full px-2 py-0.5">
          {t("teacher_quiz_manage.bulk_time.selected_count", {
            selected: selectedCount,
            total: totalQuestions,
          })}
        </Badge>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant whitespace-nowrap">
          {t("teacher_quiz_manage.bulk_time.duration_seconds")}
        </label>
        <Input
          type="number"
          min={1}
          step={1}
          value={bulkSeconds}
          onChange={(e) => onBulkSecondsChange(e.target.value)}
          className="bg-m3-surface text-sm w-24"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap ml-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSelectAll}
          disabled={totalQuestions === 0}
        >
          {t("teacher_quiz_manage.bulk_time.select_all")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={selectedCount === 0}
        >
          {t("teacher_quiz_manage.bulk_time.deselect")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!applyValid || applying}
          onClick={onApply}
          className="gap-2 gradient-primary text-white border-0"
        >
          {applying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {t("teacher_quiz_manage.bulk_time.apply")}
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({
  quizId,
  question,
  selected,
  onToggleSelect,
  onQueueDelete,
}: {
  quizId: string;
  question: QuizQuestionAuthoring;
  selected: boolean;
  onToggleSelect: () => void;
  onQueueDelete: (item: PendingQuestionDelete) => void;
}) {
  const { t } = useTranslation();
  const updateQuestion = useUpdateQuizQuestion(quizId, question.id);
  const regenerate = useRegenerateQuestion(quizId, question.id);

  const [draft, setDraft] = useState(() => buildQuestionDraft(question));

  useEffect(() => {
    setDraft(buildQuestionDraft(question));
  }, [question]);

  const hasOptions =
    (question.question_type === "multiple_choice" ||
      question.question_type === "true_false") &&
    draft.options.length > 0;
  const correctAnswer = readCorrectAnswer(question);
  const blankCount =
    question.question_type === "fill_blank"
      ? countBlanks(question.prompt_text ?? "")
      : 0;
  const expectedSeconds =
    question.expected_response_time_ms == null
      ? null
      : Math.round(question.expected_response_time_ms / 1000);

  async function handleSave(reviewStatus = draft.review_status) {
    if (!draft.prompt_text.trim()) {
      toast.error(t("teacher_quiz_manage.errors.prompt_required"));
      return;
    }
    if (hasOptions) {
      if (draft.options.some((o) => !o.option_text.trim())) {
        toast.error(t("teacher_quiz_manage.errors.option_text_required"));
        return;
      }
      if (draft.options.filter((o) => o.is_correct).length !== 1) {
        toast.error(t("teacher_quiz_manage.errors.exactly_one_correct"));
        return;
      }
    }
    try {
      await updateQuestion.mutateAsync({
        prompt_text: draft.prompt_text.trim(),
        hint_text: draft.hint_text.trim() || null,
        explanation: draft.explanation.trim() || null,
        difficulty: draft.difficulty,
        bloom_level: draft.bloom_level,
        expected_response_time_ms:
          draft.expected_response_seconds == null
            ? null
            : Math.max(1, Math.round(draft.expected_response_seconds)) * 1000,
        expected_ef_ceiling:
          draft.expected_ef_ceiling == null
            ? null
            : draft.expected_ef_ceiling,
        review_status: reviewStatus,
        ...(hasOptions
          ? {
              options: draft.options.map((o) => ({
                id: o.id,
                option_key: o.option_key,
                option_text: o.option_text.trim(),
                is_correct: o.is_correct,
              })),
            }
          : {}),
      });
      toast.success(
        reviewStatus === "approved"
          ? t("teacher_quiz_manage.toasts.question_approved")
          : t("teacher_quiz_manage.toasts.question_saved"),
      );
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.save_question_failed"),
      );
    }
  }

  function handleDelete() {
    // Deferred: stage the delete (optimistically hidden by the parent) and
    // start/refresh the 5s combo timer. The Undo banner can revert it; the
    // real DELETE only fires when the combo commits. No confirm step needed
    // — undo IS the safety net.
    const prompt = (question.prompt_text ?? "").trim();
    onQueueDelete({
      id: question.id,
      label: prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt,
    });
  }

  async function handleRegenerate() {
    try {
      await regenerate.mutateAsync();
      toast.success(t("teacher_quiz_manage.toasts.regen_started"));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t("teacher_quiz_manage.toasts.regen_in_progress"));
        return;
      }
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.regen_failed"),
      );
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-m3-surface p-4 space-y-3",
        selected
          ? "border-m3-primary shadow-sm"
          : "border-m3-outline-variant/20",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4"
          />
          <span className="sr-only">
            {t("teacher_quiz_manage.questions.sr_select", {
              position: question.position,
            })}
          </span>
        </label>
        <Badge className="border-0 bg-m3-primary-fixed text-m3-primary text-[10px]">
          {t("teacher_quiz_manage.questions.position_label", {
            position: question.position,
          })}
        </Badge>
        <Badge className="border-0 bg-blue-50 text-blue-800 text-[10px] capitalize">
          {question.question_type.replace("_", " ")}
        </Badge>
        <Badge
          className={cn(
            "border-0 text-[10px] capitalize",
            question.review_status === "approved"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-50 text-amber-700",
          )}
        >
          {question.review_status}
        </Badge>
        {expectedSeconds !== null ? (
          <Badge className="border-0 bg-m3-surface-container-high text-m3-on-surface text-[10px] gap-1">
            <Clock className="h-3 w-3" />
            {expectedSeconds}s
          </Badge>
        ) : (
          <Badge className="border-0 bg-amber-50 text-amber-700 text-[10px] gap-1">
            <Clock className="h-3 w-3" />
            {t("teacher_quiz_manage.questions.no_time_set")}
          </Badge>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.editor.prompt_label")}
        </label>
        <textarea
          value={draft.prompt_text}
          onChange={(e) =>
            setDraft((current) => ({ ...current, prompt_text: e.target.value }))
          }
          rows={3}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.editor.hint_label", "Hint (shown to learner on request)")}
        </label>
        <textarea
          value={draft.hint_text}
          onChange={(e) =>
            setDraft((current) => ({ ...current, hint_text: e.target.value }))
          }
          rows={2}
          placeholder={t(
            "teacher_quiz_manage.editor.hint_placeholder",
            "e.g. Think about which property distinguishes analytical storage from transactional storage.",
          )}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        />
        <p className="text-[11px] text-m3-on-surface-variant">
          {t(
            "teacher_quiz_manage.editor.hint_help",
            "Optional. Only shown to learners if \"Show hints\" is enabled in Quiz Settings. Must not reveal the answer.",
          )}
        </p>
      </div>

      {hasOptions && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_quiz_manage.editor.options_label")}
          </label>
          {draft.options.map((option, idx) => (
            <div
              key={option.id}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2",
                option.is_correct
                  ? "border-2 border-emerald-300 bg-emerald-50/60"
                  : "border border-m3-outline-variant/20 bg-m3-surface-container-lowest",
              )}
            >
              <input
                type="radio"
                name={`correct-${question.id}`}
                checked={option.is_correct}
                onChange={() =>
                  setDraft((current) => ({
                    ...current,
                    options: current.options.map((o, j) => ({
                      ...o,
                      is_correct: j === idx,
                    })),
                  }))
                }
                className="h-4 w-4"
              />
              <span className="font-bold text-m3-on-surface-variant text-sm">
                {option.option_key}.
              </span>
              <input
                type="text"
                value={option.option_text}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    options: current.options.map((o, j) =>
                      j === idx ? { ...o, option_text: e.target.value } : o,
                    ),
                  }))
                }
                disabled={question.question_type === "true_false"}
                className="flex-1 bg-transparent text-sm text-m3-on-surface focus:outline-none disabled:text-m3-on-surface-variant disabled:cursor-not-allowed"
              />
            </div>
          ))}
        </div>
      )}

      {question.question_type === "short_answer" && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_quiz_manage.editor.correct_answer_label", "Correct answer")}
          </label>
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface">
            {typeof correctAnswer === "string" && correctAnswer.length > 0 ? (
              correctAnswer
            ) : (
              <span className="text-m3-on-surface-variant italic">
                {t(
                  "teacher_quiz_manage.editor.correct_answer_missing",
                  "(missing — regenerate to refresh)",
                )}
              </span>
            )}
          </div>
          <p className="text-[11px] text-m3-on-surface-variant">
            {t(
              "teacher_quiz_manage.editor.correct_answer_short_hint",
              "Grader is case-insensitive and treats hyphenated and unhyphenated forms as equivalent.",
            )}
          </p>
        </div>
      )}

      {question.question_type === "fill_blank" && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t(
              "teacher_quiz_manage.editor.fill_blank_label",
              "Blanks (in stem order)",
            )}
          </label>
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface space-y-1">
            {Array.isArray(correctAnswer) && correctAnswer.length > 0 ? (
              correctAnswer.map((blank, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="font-bold text-m3-on-surface-variant text-xs w-6">
                    {i + 1}.
                  </span>
                  <span>{blank}</span>
                </div>
              ))
            ) : (
              <span className="text-m3-on-surface-variant italic">
                {t(
                  "teacher_quiz_manage.editor.correct_answer_missing",
                  "(missing — regenerate to refresh)",
                )}
              </span>
            )}
          </div>
          <p className="text-[11px] text-m3-on-surface-variant">
            {t(
              "teacher_quiz_manage.editor.fill_blank_hint",
              "Stem must contain {{count}} blank(s) marked with three or more underscores ({{marker}}).",
              {
                count: Array.isArray(correctAnswer)
                  ? correctAnswer.length
                  : blankCount,
                marker: "___",
              },
            )}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-3 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-m3-secondary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-m3-secondary">
            {t(
              "teacher_quiz_manage.editor.metadata_label",
              "Cognitive metadata",
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("teacher_quiz_manage.editor.bloom_label", "Bloom level")}
            </label>
            <select
              value={draft.bloom_level}
              onChange={(e) =>
                setDraft((current) => ({
                  ...current,
                  bloom_level: e.target.value,
                }))
              }
              className="h-8 w-full rounded-md border border-m3-outline-variant/30 bg-m3-surface px-2 text-xs text-m3-on-surface focus:border-m3-secondary focus:outline-none capitalize"
            >
              {[
                "remember",
                "understand",
                "apply",
                "analyze",
                "evaluate",
                "create",
              ].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("teacher_quiz_manage.editor.difficulty_label", "Difficulty")}
            </label>
            <select
              value={draft.difficulty}
              onChange={(e) =>
                setDraft((current) => ({
                  ...current,
                  difficulty: e.target.value,
                }))
              }
              className="h-8 w-full rounded-md border border-m3-outline-variant/30 bg-m3-surface px-2 text-xs text-m3-on-surface focus:border-m3-secondary focus:outline-none capitalize"
            >
              {["easy", "medium", "hard"].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t(
                "teacher_quiz_manage.editor.t_exp_label",
                "Expected time (s)",
              )}
            </label>
            <Input
              type="number"
              min={1}
              max={600}
              value={draft.expected_response_seconds ?? ""}
              placeholder={t(
                "teacher_quiz_manage.editor.t_exp_placeholder",
                "e.g. 45",
              )}
              onChange={(e) =>
                setDraft((current) => ({
                  ...current,
                  expected_response_seconds:
                    e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className="h-8 bg-m3-surface text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t(
                "teacher_quiz_manage.editor.ef_ceiling_label",
                "EF ceiling",
              )}
            </label>
            <Input
              type="number"
              step={0.05}
              min={1.3}
              max={3.5}
              value={draft.expected_ef_ceiling ?? ""}
              placeholder={t(
                "teacher_quiz_manage.editor.ef_ceiling_placeholder",
                "e.g. 2.50",
              )}
              onChange={(e) =>
                setDraft((current) => ({
                  ...current,
                  expected_ef_ceiling:
                    e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className="h-8 bg-m3-surface text-xs"
            />
          </div>
        </div>
        <p className="text-[10px] text-m3-on-surface-variant">
          {t(
            "teacher_quiz_manage.editor.metadata_hint",
            "Bloom + difficulty drive analytics. Expected time gates publishing. EF ceiling caps the SR scheduler's mastery factor (1.30–3.50).",
          )}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.editor.explanation_label")}
        </label>
        <textarea
          value={draft.explanation}
          onChange={(e) =>
            setDraft((current) => ({ ...current, explanation: e.target.value }))
          }
          rows={2}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={() => handleSave()}
          disabled={updateQuestion.isPending}
          className="gap-2"
        >
          {updateQuestion.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {t("common.save")}
        </Button>
        {question.review_status !== "approved" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleSave("approved")}
            disabled={updateQuestion.isPending}
            className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("teacher_quiz_manage.editor.approve")}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleRegenerate}
          disabled={regenerate.isPending}
          className="gap-2"
        >
          {regenerate.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {t("teacher_quiz_manage.editor.regenerate")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleDelete}
          className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("common.delete")}
        </Button>
      </div>
    </div>
  );
}

interface QuestionDraft {
  prompt_text: string;
  hint_text: string;
  explanation: string;
  difficulty: string;
  bloom_level: string;
  expected_response_seconds: number | null;
  expected_ef_ceiling: number | null;
  review_status: string;
  options: Array<{
    id: string;
    option_key: string;
    option_text: string;
    is_correct: boolean;
  }>;
}

/** Pull the canonical correct answer out of an AI-generated question.
 *
 * MCQ + T/F store the answer in the option rows (``is_correct``); the
 * other types store it on ``original_generated_payload.correct_answer``
 * (string for short_answer, array of strings for fill_blank). The
 * payload field is read-only in the v1 authoring UI; teachers edit
 * stem + explanation, and regenerate to change the answer. */
function readCorrectAnswer(question: QuizQuestionAuthoring): string | string[] | null {
  const payload = question.original_generated_payload as
    | { correct_answer?: unknown }
    | null
    | undefined;
  const raw = payload?.correct_answer;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.map((entry) => String(entry));
  return null;
}

function countBlanks(promptText: string): number {
  const matches = promptText.match(/_{3,}/g);
  return matches ? matches.length : 0;
}

function buildQuestionDraft(question: QuizQuestionAuthoring): QuestionDraft {
  return {
    prompt_text: question.prompt_text ?? "",
    hint_text: question.hint_text ?? "",
    explanation: question.explanation ?? "",
    difficulty: question.difficulty ?? "medium",
    bloom_level: question.bloom_level ?? "understand",
    expected_response_seconds:
      question.expected_response_time_ms == null
        ? null
        : Math.round(question.expected_response_time_ms / 1000),
    expected_ef_ceiling:
      question.expected_ef_ceiling == null
        ? null
        : Number(question.expected_ef_ceiling),
    review_status: question.review_status ?? "pending",
    options: (question.options ?? []).map((o) => ({
      id: o.id,
      option_key: o.option_key,
      option_text: o.option_text,
      is_correct: o.is_correct,
    })),
  };
}

function GenerateModal({
  quizId,
  moduleId,
  hasExistingQuestions,
  onClose,
}: {
  quizId: string;
  moduleId: string;
  hasExistingQuestions: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl bg-m3-surface p-6 shadow-xl space-y-4 my-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-1">
              <h2 className="font-headline font-bold text-base text-m3-on-surface">
                {t("teacher_quiz_manage.generate_modal.title")}
              </h2>
              <p className="text-sm text-m3-on-surface-variant">
                {t("teacher_quiz_manage.generate_modal.description")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 shrink-0"
            title={t("common.close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <QuizGenerationPanel
          quizId={quizId}
          moduleId={moduleId}
          hasExistingQuestions={hasExistingQuestions}
        />
      </div>
    </div>
  );
}


function SettingsTab({
  draft,
  setDraft,
  onSubmit,
  saving,
}: {
  draft: SettingsDraft;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  onSubmit: (e: React.FormEvent) => void;
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
      <SettingsSection
        title={t("teacher_quiz_manage.settings.general.title")}
        description={t("teacher_quiz_manage.settings.general.description")}
      >
        <Field label={t("teacher_quiz_manage.settings.general.title_label")}>
          <Input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={t(
              "teacher_quiz_manage.settings.general.title_placeholder",
            )}
            className="bg-m3-surface text-sm"
          />
        </Field>
        <Field label={t("teacher_quiz_manage.settings.general.desc_label")}>
          <textarea
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            placeholder={t(
              "teacher_quiz_manage.settings.general.desc_placeholder",
            )}
            className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          />
        </Field>
      </SettingsSection>

      <SettingsSection title={t("teacher_quiz_manage.settings.scoring.title")}>
        <Field
          label={
            <span className="flex items-center justify-between">
              <span>{t("teacher_quiz_manage.settings.scoring.pass_score")}</span>
              <span className="text-m3-primary font-extrabold text-sm">
                {draft.passing_score_percent}%
              </span>
            </span>
          }
        >
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={draft.passing_score_percent}
            onChange={(e) =>
              update("passing_score_percent", Number(e.target.value))
            }
            className="w-full h-2 rounded-full cursor-pointer accent-[var(--m3-primary)]"
          />
        </Field>
        <Field
          label={t("teacher_quiz_manage.settings.scoring.time_label")}
          hint={t("teacher_quiz_manage.settings.scoring.time_hint")}
        >
          <Input
            type="number"
            min={1}
            max={180}
            value={draft.time_limit_minutes}
            onChange={(e) => update("time_limit_minutes", e.target.value)}
            placeholder={t(
              "teacher_quiz_manage.settings.scoring.time_placeholder",
            )}
            className="bg-m3-surface text-sm w-40"
          />
        </Field>
      </SettingsSection>

      <SettingsSection title={t("teacher_quiz_manage.settings.attempts.title")}>
        <ToggleRow
          label={t("teacher_quiz_manage.settings.attempts.allow_label")}
          description={t("teacher_quiz_manage.settings.attempts.allow_desc")}
          value={draft.allow_retakes}
          onChange={(v) => update("allow_retakes", v)}
        />
        {draft.allow_retakes && (
          <div className="ml-1 pl-4 border-l-2 border-m3-primary/30 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <Field
              label={t("teacher_quiz_manage.settings.attempts.max_label")}
              hint={t("teacher_quiz_manage.settings.attempts.max_hint")}
            >
              <Input
                type="number"
                min={1}
                value={draft.max_attempts}
                onChange={(e) => update("max_attempts", e.target.value)}
                placeholder={t(
                  "teacher_quiz_manage.settings.attempts.max_placeholder",
                )}
                className="bg-m3-surface text-sm"
              />
            </Field>
            <Field
              label={t("teacher_quiz_manage.settings.attempts.cooldown_label")}
              hint={t("teacher_quiz_manage.settings.attempts.cooldown_hint")}
            >
              <Input
                type="number"
                min={0}
                value={draft.cooldown_hours}
                onChange={(e) => update("cooldown_hours", e.target.value)}
                placeholder={t(
                  "teacher_quiz_manage.settings.attempts.cooldown_placeholder",
                )}
                className="bg-m3-surface text-sm"
              />
            </Field>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title={t("teacher_quiz_manage.settings.behavior.title")}>
        <ToggleRow
          label={t("teacher_quiz_manage.settings.behavior.shuffle_q_label")}
          description={t(
            "teacher_quiz_manage.settings.behavior.shuffle_q_desc",
          )}
          value={draft.shuffle_questions}
          onChange={(v) => update("shuffle_questions", v)}
        />
        <ToggleRow
          label={t("teacher_quiz_manage.settings.behavior.shuffle_o_label")}
          description={t(
            "teacher_quiz_manage.settings.behavior.shuffle_o_desc",
          )}
          value={draft.shuffle_options}
          onChange={(v) => update("shuffle_options", v)}
        />
        <ToggleRow
          label={t("teacher_quiz_manage.settings.behavior.show_hints_label")}
          description={t(
            "teacher_quiz_manage.settings.behavior.show_hints_desc",
          )}
          value={draft.show_hints}
          onChange={(v) => update("show_hints", v)}
        />
        <ToggleRow
          label={t("teacher_quiz_manage.settings.behavior.reminders_label")}
          description={t(
            "teacher_quiz_manage.settings.behavior.reminders_desc",
          )}
          value={draft.reminders_enabled}
          onChange={(v) => update("reminders_enabled", v)}
        />
      </SettingsSection>

      <SettingsSection
        title={t("teacher_quiz_manage.settings.spacing.title")}
        description={t("teacher_quiz_manage.settings.spacing.description")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={t("teacher_quiz_manage.settings.spacing.starting_ef")}>
            <Input
              type="number"
              min={1.3}
              max={5.0}
              step={0.1}
              value={draft.initial_ef}
              onChange={(e) => update("initial_ef", e.target.value)}
              placeholder="2.50"
              className="bg-m3-surface text-sm"
            />
          </Field>
          <Field label={t("teacher_quiz_manage.settings.spacing.unlock_ef")}>
            <Input
              type="number"
              min={1.3}
              max={5.0}
              step={0.1}
              value={draft.min_ef_for_unlock}
              onChange={(e) => update("min_ef_for_unlock", e.target.value)}
              placeholder="2.30"
              className="bg-m3-surface text-sm"
            />
          </Field>
          <Field label="Coverage (%)">
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={draft.coverage_threshold}
              onChange={(e) => update("coverage_threshold", e.target.value)}
              placeholder="85"
              className="bg-m3-surface text-sm"
            />
          </Field>
        </div>
      </SettingsSection>

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
          {t("teacher_quiz_manage.settings.save_button")}
        </Button>
      </div>
    </form>
  );
}

function SettingsSection({
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

function PreviewTab({
  quiz,
  questions,
}: {
  quiz: QuizAuthoring;
  questions: QuizQuestionAuthoring[];
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl p-6 lg:p-8 space-y-6 shadow-glass">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-headline font-extrabold text-xl text-m3-on-surface">
            {t("teacher_quiz_manage.preview.title")}
          </h2>
          <p className="text-sm text-m3-on-surface-variant mt-1">
            {t("teacher_quiz_manage.preview.description", { title: quiz.title })}
          </p>
        </div>
        <Badge className="border border-m3-outline-variant/40 bg-m3-surface-container-low text-m3-on-surface-variant rounded-full text-[11px] font-medium px-3 py-1 self-start sm:self-auto">
          {t("teacher_quiz_manage.preview.read_only")}
        </Badge>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-16 text-m3-on-surface-variant space-y-1">
          <HelpCircle className="h-8 w-8 mx-auto text-m3-outline-variant" />
          <p className="text-base font-bold">
            {t("teacher_quiz_manage.empty.no_questions_title")}
          </p>
          <p className="text-sm">
            {t("teacher_quiz_manage.preview.empty_body")}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {questions.map((question, idx) => (
            <PreviewQuestion key={question.id} index={idx} question={question} />
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewQuestion({
  index,
  question,
}: {
  index: number;
  question: QuizQuestionAuthoring;
}) {
  const { t } = useTranslation();
  const hasOptions =
    (question.question_type === "multiple_choice" ||
      question.question_type === "true_false") &&
    question.options.length > 0;
  const correctAnswer = readCorrectAnswer(question);

  return (
    <div className="rounded-xl bg-m3-surface-container-low border border-m3-outline-variant/15 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="shrink-0 h-7 w-7 rounded-full gradient-primary text-white flex items-center justify-center text-xs font-extrabold">
          {index + 1}
        </span>
        <p className="text-sm font-semibold text-m3-on-surface leading-relaxed">
          {question.prompt_text || (
            <span className="italic text-m3-on-surface-variant">
              {t("teacher_quiz_manage.preview.no_content")}
            </span>
          )}
        </p>
      </div>

      {hasOptions && (
        <div className="space-y-2 pl-10">
          {question.options.map((opt) => (
            <div
              key={opt.id}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm",
                opt.is_correct
                  ? "border-2 border-emerald-300 bg-emerald-50/60 text-m3-on-surface font-medium"
                  : "border border-m3-outline-variant/20 bg-m3-surface text-m3-on-surface",
              )}
            >
              <span className="font-bold text-m3-on-surface-variant">
                {opt.option_key}.
              </span>
              <span className="flex-1">
                {opt.option_text || (
                  <span className="italic text-m3-on-surface-variant">
                    {t("teacher_quiz_manage.preview.no_content")}
                  </span>
                )}
              </span>
              {opt.is_correct && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {t("teacher_quiz_manage.preview.correct")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {question.question_type === "short_answer" && (
        <div className="pl-10">
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface">
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mr-2">
              {t("teacher_quiz_manage.preview.correct")}
            </span>
            {typeof correctAnswer === "string" && correctAnswer.length > 0 ? (
              correctAnswer
            ) : (
              <span className="italic text-m3-on-surface-variant">
                {t("teacher_quiz_manage.preview.no_content")}
              </span>
            )}
          </div>
        </div>
      )}

      {question.question_type === "fill_blank" && (
        <div className="pl-10">
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-1">
              {t("teacher_quiz_manage.preview.correct")}
            </div>
            {Array.isArray(correctAnswer) && correctAnswer.length > 0 ? (
              correctAnswer.map((blank, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="font-bold text-m3-on-surface-variant text-xs w-6">
                    {i + 1}.
                  </span>
                  <span>{blank}</span>
                </div>
              ))
            ) : (
              <span className="italic text-m3-on-surface-variant">
                {t("teacher_quiz_manage.preview.no_content")}
              </span>
            )}
          </div>
        </div>
      )}

      {question.explanation && (
        <div className="pl-10">
          <p className="text-xs text-m3-on-surface-variant bg-m3-surface-container rounded-xl px-3 py-2 italic">
            <span className="font-bold not-italic">
              {t("teacher_quiz_manage.editor.explanation_inline")}{" "}
            </span>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
