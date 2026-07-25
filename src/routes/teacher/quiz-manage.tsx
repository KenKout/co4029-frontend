import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  FileUp,
  HelpCircle,
  ListChecks,
  Loader2,
  LockIcon,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { PreviewCard } from "@base-ui/react/preview-card";
import { toast } from "sonner";

import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ApiError } from "@/lib/api/client";
import {
  useAddQuizQuestion,
  useBulkApprove,
  useBulkSetExpectedTime,
  useDeleteQuiz,
  usePatchQuiz,
  usePublishQuiz,
  useQuizAuthoring,
  useRegenerateQuestion,
  useUpdateQuizQuestion,
  usePendingQuestionDeletes,
  type PendingQuestionDelete,
  type ReviewOptions,
} from "@/lib/api/hooks/quizzes";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/teacher-courses";
import { useTeacherCourseOutcomes } from "@/lib/api/hooks/courses";
import type {
  CourseLearningOutcomeAuthoring,
  QuizAuthoring,
  QuizQuestionAuthoring,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { QuestionBankModal } from "./_components/question-bank-modal";
import { MasterySelector } from "./_components/MasterySelector";
import {
  ReviewOptionsMatrix,
  defaultReviewOptions,
} from "./_components/quiz-manage/ReviewOptionsMatrix";
import { ImportExportPanel } from "./_components/quiz-manage/ImportExportPanel";
import { OverridesPanel } from "./_components/quiz-manage/OverridesPanel";
import { FeedbackBandsPanel } from "./_components/quiz-manage/FeedbackBandsPanel";
import { TypeSpecificAnswerEditor } from "./_components/quiz-manage/TypeSpecificAnswerEditor";

type TabKey = "questions" | "settings" | "preview";

// Tab order: Settings first (configure the quiz), then Questions (author the
// content), then Preview (see it as a student). Matches the natural authoring
// flow teachers follow.
const TAB_KEYS: ReadonlyArray<TabKey> = ["settings", "questions", "preview"];

// Default expected response time (seconds) pre-filled on questions that don't
// have one set, so teachers start from a sensible value instead of blank.
const DEFAULT_EXPECTED_SECONDS = 60;

// Icon per tab — used for the condensed icon-only vertical rail that the tab
// strip morphs into once it sticks under the global top bar.
const TAB_ICONS: Record<
  TabKey,
  React.ComponentType<{ className?: string }>
> = {
  questions: ListChecks,
  settings: Settings,
  preview: Eye,
};

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
  // Moodle-style headline-score policy (migration 0033).
  grading_method: "highest" | "average" | "first" | "last";
  // Scheduling window (migration 0032). Held as `datetime-local` strings
  // ("YYYY-MM-DDTHH:mm", local time) or "" when unset.
  available_from: string;
  available_until: string;
  due_at: string;
  // Review-visibility matrix (Phase 2). Always a full 3×5 matrix in the draft.
  review_options: ReviewOptions;
  // Access rules (Phase 12). Empty string = no restriction.
  require_password: string;
  require_subnet: string;
  browser_security: boolean;
  // Timing enforcement (Phase 6).
  overdue_handling: "autosubmit" | "graceperiod" | "autoabandon";
  grace_period_seconds: string;
}

function toDraftString(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

/**
 * Convert a server ISO-8601 UTC instant to the local-time value a
 * `datetime-local` input expects ("YYYY-MM-DDTHH:mm"). Returns "" for
 * null/empty/invalid so an unset window renders as a blank field.
 */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/**
 * Convert a `datetime-local` value (local time) back to an ISO-8601 UTC
 * string for the API, or null when blank. The Date ctor interprets the
 * bare local string in the browser's zone, and toISOString normalises to UTC.
 */
function localInputToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
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
    grading_method: quiz.grading_method ?? "highest",
    available_from: isoToLocalInput(quiz.available_from),
    available_until: isoToLocalInput(quiz.available_until),
    due_at: isoToLocalInput(quiz.due_at),
    review_options: quiz.review_options ?? defaultReviewOptions(),
    require_password: quiz.require_password ?? "",
    require_subnet: quiz.require_subnet ?? "",
    browser_security: quiz.browser_security ?? false,
    overdue_handling: quiz.overdue_handling ?? "autosubmit",
    grace_period_seconds: toDraftString(quiz.grace_period_seconds),
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
  const { data: outcomes } = useTeacherCourseOutcomes(courseId);

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

  const [tab, setTab] = useState<TabKey>("settings");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkSeconds, setBulkSeconds] = useState<string>("60");

  // Jump from the Preview tab to a specific question in the Questions editor:
  // switch tabs, then scroll the target card into view after it renders. The
  // rAF chain waits one paint so the Questions tab (and its cards) are mounted
  // before we look up the DOM node.
  const goToQuestionInEditor = useCallback((questionId: string) => {
    setTab("questions");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`qcard-${questionId}`);
        if (!el) return;
        const reduceMotion =
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    });
  }, []);

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

  // "Icons-only when stuck" needs to know when the sticky action strip is
  // actually pinned. CSS can't express that, so we watch a zero-height
  // sentinel placed just above the strip: when it scrolls out of view under
  // the global top bar, the strip is stuck and we condense it to icons.
  // NOTE: these hooks MUST stay above the early returns below (loading /
  // not-found guards) — hooks after a conditional return violate the rules
  // of hooks and throw React error #310 once the data loads.
  const [actionsStuck, setActionsStuck] = useState(false);
  const stickyObserverRef = useRef<IntersectionObserver | null>(null);
  // CALLBACK ref (not useRef + useEffect): the sentinel only mounts AFTER the
  // loading / not-found early returns pass, so an effect with [] deps would
  // run once while the node is still null and never re-attach. A callback ref
  // fires exactly when the node mounts (and unmounts), so the observer always
  // attaches once the real content renders.
  const stickySentinelRef = useCallback((node: HTMLDivElement | null) => {
    stickyObserverRef.current?.disconnect();
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActionsStuck(!entry.isIntersecting),
      // rootMargin top offset = global ContentTopBar height (64px / top-16)
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(node);
    stickyObserverRef.current = observer;
  }, []);

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
        <Link
          to="/teacher/courses/$courseId"
          params={{ courseId }}
          className="inline-flex"
        >
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
  // Partial publish: students only ever see approved questions, so publish is
  // allowed as soon as at least ONE question is approved. Un-approved
  // questions stay on the quiz as reusable drafts and are never served to
  // students. This mirrors the backend publish_gate (needs ≥1 approved).
  const approvedCount = questions.filter(
    (q) => q.review_status === "approved",
  ).length;
  const pendingReviewCount = questions.length - approvedCount;
  // Advisory only — surfaces "N pending" so the teacher knows some questions
  // won't be published, but it no longer blocks publishing.
  const hasPendingReview = pendingReviewCount > 0;
  const publishDisabled =
    publishQuiz.isPending || isPublished || approvedCount === 0;

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
      setConfirmPublish(false);
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        err.status === 422 &&
        (err.code === "missing_t_exp" ||
          err.code === "missing_expected_response_time" ||
          err.code === "missing_expected_time")
      ) {
        setConfirmPublish(false);
        return;
      }
      // Backend approval gate (pending_review): keep the dialog open is
      // pointless since the gate can't be satisfied from here — surface the
      // message and close so the teacher goes back to approve questions.
      if (
        err instanceof ApiError &&
        err.status === 422 &&
        err.code === "pending_review"
      ) {
        toast.error(t("teacher_quiz_manage.toasts.publish_pending_review"));
        setConfirmPublish(false);
        return;
      }
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.publish_failed"),
      );
    }
  }

  async function handleAddQuestion(questionType = "multiple_choice") {
    // Phase 7: seed the right shape per type. MCQ/T-F seed option rows; the
    // expanded types seed their own answer fields (edited in the card after).
    const base: Record<string, unknown> = {
      question_type: questionType,
      prompt_text: t("teacher_quiz_manage.new_question.prompt"),
      explanation: t("teacher_quiz_manage.new_question.explanation"),
      difficulty: "medium",
      bloom_level: "understand",
    };
    let payload: Record<string, unknown>;
    switch (questionType) {
      case "true_false":
        payload = {
          ...base,
          options: [
            { option_key: "T", option_text: "True", is_correct: true },
            { option_key: "F", option_text: "False", is_correct: false },
          ],
        };
        break;
      case "short_answer":
        payload = { ...base };
        break;
      case "numerical":
        payload = { ...base, numeric_answer: 0, numeric_tolerance: 0 };
        break;
      case "matching":
        payload = {
          ...base,
          match_pairs: [
            { left: "Term 1", right: "Match 1" },
            { left: "Term 2", right: "Match 2" },
          ],
        };
        break;
      case "ordering":
        payload = {
          ...base,
          ordering_sequence: ["First", "Second", "Third"],
        };
        break;
      default:
        payload = {
          ...base,
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
        };
    }
    try {
      await addQuestion.mutateAsync(payload);
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
        grading_method: draft.grading_method,
        available_from: localInputToIso(draft.available_from),
        available_until: localInputToIso(draft.available_until),
        due_at: localInputToIso(draft.due_at),
        review_options: draft.review_options,
        require_password: draft.require_password.trim() || null,
        require_subnet: draft.require_subnet.trim() || null,
        browser_security: draft.browser_security,
        overdue_handling: draft.overdue_handling,
        grace_period_seconds: integerOrNull(draft.grace_period_seconds),
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
    <div className="space-y-6 pt-4 lg:pt-6 pb-12 max-w-[1800px] mx-auto">
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
      </div>

      {/* Published = frozen. Students can see/attempt the quiz, so the backend
          rejects all authoring edits (409 quiz_published_readonly). Surface a
          clear banner and disable the editing controls so teachers understand
          the lock instead of hitting errors. */}
      {isPublished && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <LockIcon className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {t(
              "teacher_quiz_manage.published_readonly_banner",
              "This quiz is published. Questions and any settings that affect scoring, timing, or presentation are frozen so students mid-attempt aren't disrupted. You can still edit the title, description, schedule, and reminders. Archive the quiz first to change anything else.",
            )}
          </span>
        </div>
      )}

      {/* Zero-height sentinel: when it scrolls up under the global top bar,
          the sticky strip below is pinned and we condense actions to icons. */}
      <div ref={stickySentinelRef} aria-hidden className="h-px w-full" />

      {/* Sticky strip: tab bar + page actions (View-as-student / Publish /
          Delete). Pinned at top-16 (just under the global ContentTopBar) so
          the teacher can publish/preview/delete from anywhere in a long quiz
          without scrolling back up. z-20 keeps it below ContentTopBar and the
          sidebar per frontend/AGENTS.md. Once stuck, it gains a solid blurred
          background + shadow and the action buttons drop their text labels
          (icons only) to stay compact. */}
      {/* `relative` so the condensed vertical tab rail can be absolutely
          positioned into the left gutter (out of content flow) once stuck. */}
      <div className="sticky top-16 z-20 -mx-1 px-1">
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl transition-all",
            // Once pinned, the strip becomes a single solid, blurred toolbar
            // band that stays IN FLOW and horizontal. A solid background is
            // what stops content bleeding through; the previous "peel the tabs
            // off into an absolute left rail" trick floated them OVER the
            // content (the overlay bug). One in-flow band = no overlay.
            actionsStuck
              ? "border border-m3-outline-variant/30 bg-m3-surface/95 backdrop-blur-md shadow-sm px-2 py-2"
              : "border border-transparent px-0 py-0",
          )}
        >
          {/* Tab switcher. Not stuck → horizontal pills with text labels,
              in-flow. Stuck → animates into a vertical, icon-only rail parked
              in the left gutter (absolute, so it respects the sidebar margin
              via its in-flow parent and never covers the center content),
              sliding in from the left with tooltips for each tab. */}
          <div
            className={cn(
              "transition-all duration-300 ease-out inline-flex gap-1 rounded-xl p-1",
              actionsStuck
                // Stays in-flow inside the solid toolbar band — icon-only to
                // stay compact, but horizontal and never floating over content.
                ? "border border-transparent"
                : "border border-m3-outline-variant/20 bg-m3-surface-container-low shadow-lg shadow-m3-primary/5",
            )}
          >
            {TAB_KEYS.map((key) => {
              const active = key === tab;
              const Icon = TAB_ICONS[key];
              const label = t(`teacher_quiz_manage.tabs.${key}`);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  aria-pressed={active}
                  aria-label={label}
                  title={actionsStuck ? label : undefined}
                  className={cn(
                    "rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center border",
                    actionsStuck
                      ? "h-10 w-10"
                      : "px-4 py-2 text-sm gap-2",
                    // Active tab: in the stuck rail it needs a solid blue fill
                    // with a WHITE icon + gray border so it doesn't blend into
                    // the content showing through behind the rail. In the
                    // normal (not-stuck) strip it keeps the subtle pill look.
                    active
                      ? actionsStuck
                        ? "bg-m3-primary text-white border-m3-outline-variant/40 shadow-sm"
                        : "bg-surface-elev text-m3-primary border-transparent shadow-sm"
                      : "border-transparent text-m3-on-surface-variant hover:text-m3-primary/80",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!actionsStuck && <span>{label}</span>}
                </button>
              );
            })}
          </div>

          {/* Actions stay pinned to the right. Once stuck, the tab rail peels
              off to an absolute left-gutter position, leaving this as the only
              in-flow child — `ml-auto` keeps it hard-right, and it gets its own
              compact blurred pill so the buttons don't float bare over the
              content (the old full-width band is gone). */}
          <div
            className={cn(
              "flex items-center gap-2 shrink-0 transition-all",
              // The parent strip is now the solid band; actions just hug right.
              actionsStuck && "ml-auto",
            )}
          >
            {/* Results only make sense once the quiz is published — a draft
                being configured has no attempts yet, so the button is hidden
                during configuration and appears after publish. */}
            {isPublished && (
              <Link
                to="/teacher/courses/$courseId/quizzes/$quizId/results"
                params={{ courseId, quizId }}
              >
                <Button
                  variant="outline"
                  className="gap-2"
                  type="button"
                  title={t("teacher_quiz_manage.actions.view_results")}
                >
                  <BarChart3 className="h-4 w-4" />
                  {!actionsStuck &&
                    t("teacher_quiz_manage.actions.view_results")}
                </Button>
              </Link>
            )}
            {/* "View as student" used to be a button here, but it was
                redundant with the Preview tab (both open the same in-app
                WYSIWYG PreviewTab). Removed the button; the Preview tab is
                now the single entry point (plus a jump-to-preview button in
                the publish dialog). The tab intentionally does NOT link to
                the live student route (/courses/$slug/quiz/$quizId) — that
                serves only PUBLISHED quizzes, so previewing a draft 404s. */}
            <Button
              type="button"
              disabled={publishDisabled}
              onClick={() => setConfirmPublish(true)}
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
              {!actionsStuck &&
                (isPublished
                  ? t("teacher_quiz_manage.status.published")
                  : t("teacher_quiz_manage.actions.publish"))}
            </Button>
            {/* Delete is hidden once published: students may be mid-attempt,
                and the backend blocks destructive changes on a live quiz.
                Archive first (frees the freeze) to delete. */}
            {!isPublished && (
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
                onClick={() => setConfirmDelete(true)}
                disabled={deleteQuiz.isPending}
                title={t("teacher_quiz_manage.actions.delete_quiz_tooltip")}
              >
                <Trash2 className="h-4 w-4" />
                {!actionsStuck && t("common.delete")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* When published the quiz is frozen (backend hard-blocks with 409). A
          native <fieldset disabled> on the editable tabs disables every input,
          select, textarea and button inside in one shot — no need to thread a
          readOnly flag through every nested control. border-0 p-0 m-0 min-w-0
          neutralize the default fieldset chrome so layout is unchanged. */}
      {tab === "questions" && (
        <fieldset
          disabled={isPublished}
          className="border-0 p-0 m-0 min-w-0 disabled:opacity-70"
        >
          <QuestionsTab
            quizId={quizId}
            questions={questions}
            outcomes={outcomes ?? []}
            selectedIds={selectedQuestionIds}
            onToggleSelect={toggleQuestionSelection}
            onSelectAll={selectAllQuestions}
            onClearSelection={clearSelection}
            bulkSeconds={bulkSeconds}
            onBulkSecondsChange={setBulkSeconds}
            onAddQuestion={handleAddQuestion}
            addPending={addQuestion.isPending}
            onOpenGenerator={() =>
              navigate({
                to: "/teacher/courses/$courseId/quizzes/$quizId/generate",
                params: { courseId, quizId },
              })
            }
            onOpenBank={() => setShowBankModal(true)}
            onOpenImportExport={() => setShowImportExport(true)}
            onQueueDelete={pendingDeletes.queueDelete}
            published={isPublished}
          />
        </fieldset>
      )}

      {tab === "settings" && draft && quiz && (
        // Settings is field-aware when published: student-safe fields
        // (title/description/schedule/reminders) stay editable; the rest is
        // locked per-section inside SettingsTab. Mirrors the backend
        // whitelist in authoring.py (_PUBLISHED_EDITABLE_FIELDS).
        <SettingsTab
          quizId={quizId}
          draft={draft}
          setDraft={setDraft}
          onSubmit={handleSaveSettings}
          saving={patchQuiz.isPending}
          locked={isPublished}
          dirty={
            JSON.stringify(draft) !== JSON.stringify(draftFromQuiz(quiz))
          }
          onReset={() => setDraft(draftFromQuiz(quiz))}
        />
      )}

      {tab === "preview" && (
        <PreviewTab
          quiz={quiz}
          questions={questions}
          onEditQuestion={goToQuestionInEditor}
          onQueueDelete={pendingDeletes.queueDelete}
        />
      )}

      {/* Page-level combo-undo banner. Lifted out of the Questions tab so it
          stays visible when a delete is queued from the Preview tab too. Fixed
          bottom-center, z-30 (above content + top bar, below sidebar per
          frontend/AGENTS.md). */}
      {pendingDeletes.comboCount > 0 && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 flex items-center gap-3 rounded-xl bg-m3-inverse-surface text-m3-inverse-on-surface px-4 py-3 shadow-lg max-w-[calc(100vw-2rem)]">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
            <svg
              className="absolute inset-0 h-8 w-8 -rotate-90"
              viewBox="0 0 32 32"
            >
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
                  2 * Math.PI * 14 * (1 - pendingDeletes.secondsLeft / 5)
                }
              />
            </svg>
            <span className="text-sm font-bold tabular-nums">
              {pendingDeletes.secondsLeft}
            </span>
          </div>
          <span className="flex-1 text-sm font-medium whitespace-nowrap">
            {t("teacher_quiz_manage.combo_undo.message", {
              count: pendingDeletes.comboCount,
            })}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={pendingDeletes.undo}
            className="gap-2 border-white/30 bg-transparent text-m3-inverse-on-surface hover:bg-white/10 hover:text-m3-inverse-on-surface shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("teacher_quiz_manage.combo_undo.undo", {
              count: pendingDeletes.comboCount,
            })}
          </Button>
        </div>
      )}

      {/* The AI generator moved from a modal to its own full-page route
          (/generate) — the form outgrew the dialog. onOpenGenerator now
          navigates there instead of opening a modal. */}

      {showBankModal && quiz?.course_id && (
        <QuestionBankModal
          courseId={quiz.course_id}
          quizId={quizId}
          defaultModuleId={quiz.module_id}
          onClose={() => setShowBankModal(false)}
        />
      )}

      {showImportExport && (
        <ImportExportPanel
          quizId={quizId}
          onClose={() => setShowImportExport(false)}
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

      {confirmPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-m3-surface p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-m3-primary/10 text-m3-primary flex items-center justify-center shrink-0">
                <Upload className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-headline font-bold text-base text-m3-on-surface">
                  {t("teacher_quiz_manage.confirm_publish.title")}
                </h2>
                {/* Context-aware copy: from Settings/Questions the teacher
                    hasn't necessarily seen the student view, so nudge them to
                    preview first. From the Preview tab they're already looking
                    at it, so just ask for final confirmation. */}
                <p className="text-sm text-m3-on-surface-variant">
                  {tab === "preview"
                    ? t("teacher_quiz_manage.confirm_publish.body_confirm", {
                        count: approvedCount,
                      })
                    : t("teacher_quiz_manage.confirm_publish.body_preview", {
                        count: approvedCount,
                      })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmPublish(false)}
                disabled={publishQuiz.isPending}
              >
                {t("common.cancel")}
              </Button>
              {/* Preview button only when NOT already on the Preview tab.
                  Opens the in-app WYSIWYG tab rather than the live student
                  route (which 404s on a not-yet-published quiz). */}
              {tab !== "preview" && (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={publishQuiz.isPending}
                  onClick={() => {
                    setConfirmPublish(false);
                    setTab("preview");
                  }}
                >
                  <Eye className="h-4 w-4" />
                  {t("teacher_quiz_manage.actions.preview")}
                </Button>
              )}
              <Button
                type="button"
                onClick={handlePublish}
                disabled={publishQuiz.isPending}
                className="gradient-primary text-white border-0 gap-2 hover:shadow-ai-glow"
              >
                {publishQuiz.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {t("teacher_quiz_manage.actions.publish")}
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
  outcomes,
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
  onOpenImportExport,
  onQueueDelete,
  published = false,
}: {
  quizId: string;
  questions: QuizQuestionAuthoring[];
  outcomes: CourseLearningOutcomeAuthoring[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  bulkSeconds: string;
  onBulkSecondsChange: (value: string) => void;
  onAddQuestion: (questionType?: string) => void | Promise<void>;
  addPending: boolean;
  onOpenGenerator: () => void;
  onOpenBank: () => void;
  onOpenImportExport: () => void;
  onQueueDelete: (item: PendingQuestionDelete) => void;
  /** Published quiz: hide all authoring controls (bulk bar, add-question,
   *  per-card actions) instead of disabling them. */
  published?: boolean;
}) {
  const { t } = useTranslation();
  const bulkSet = useBulkSetExpectedTime(quizId);
  const bulkApprove = useBulkApprove(quizId);
  // Which questions have unsaved local edits. Owned here (not in each card) so
  // the navigator can render a Saved/Unsaved layer; each card reports its own
  // dirty state up via onDirtyChange.
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const handleDirtyChange = useCallback((id: string, dirty: boolean) => {
    setDirtyIds((prev) => {
      if (dirty === prev.has(id)) return prev; // no-op keeps referential identity
      const next = new Set(prev);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const pendingCount = questions.filter(
    (q) => q.review_status !== "approved",
  ).length;

  // Split the "no expected time on the row" population into the two cases that
  // need different messaging (see the banners below). A question is only
  // genuinely blank if the editor also has no value for it — otherwise the
  // editor is showing a pre-filled default that merely needs saving.
  const noSavedTimeQuestions = questions.filter(hasInvalidExpectedTime);
  const unsavedDefaultTimeIds = noSavedTimeQuestions
    .filter((q) => dirtyIds.has(q.id))
    .map((q) => q.id);
  const unsavedDefaultTimeCount = unsavedDefaultTimeIds.length;
  const blankExpectedTimeCount =
    noSavedTimeQuestions.length - unsavedDefaultTimeCount;

  /** Persist the pre-filled default time for every affected question at once. */
  async function handleSaveDefaultTimes() {
    try {
      const result = await bulkSet.mutateAsync({
        question_ids: unsavedDefaultTimeIds,
        expected_seconds: DEFAULT_EXPECTED_SECONDS,
      });
      toast.success(
        t("teacher_quiz_manage.toasts.expected_time_set", {
          count: result.updated,
        }),
      );
    } catch (err) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.expected_time_failed"),
      );
    }
  }

  const secondsValue = Number(bulkSeconds);
  const bulkValid =
    selectedIds.size > 0 && Number.isFinite(secondsValue) && secondsValue > 0;

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

  async function handleApproveBulk() {
    try {
      const result = await bulkApprove.mutateAsync({
        question_ids: Array.from(selectedIds),
      });
      toast.success(
        t("teacher_quiz_manage.toasts.bulk_approved", {
          count: result.approved,
        }),
      );
      onClearSelection();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.bulk_approve_failed"),
      );
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-8 space-y-4 min-w-0">
        {/* The combo-undo snackbar now lives at page level (see
            QuizManagePage) so it stays visible when a delete is queued from
            the Preview tab too. */}
        {/* Expected response time is required. Two DISTINCT situations, and
            conflating them is what made the old copy misleading:

            (a) unsaved default — the editor pre-filled DEFAULT_EXPECTED_SECONDS
                so the field LOOKS populated, but the row is still null. Nothing
                is "missing"; the teacher just needs to Save. Actionable, not an
                error, and offers a one-click bulk Save.
            (b) genuinely blank — no value on the row AND none in the editor
                (e.g. the teacher cleared it). This blocks publishing. */}
        {questions.length > 0 && unsavedDefaultTimeCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 min-w-[12rem]">
              {t("teacher_quiz_manage.banners.unsaved_default_time", {
                count: unsavedDefaultTimeCount,
                seconds: DEFAULT_EXPECTED_SECONDS,
              })}
            </span>
            <button
              type="button"
              onClick={handleSaveDefaultTimes}
              disabled={bulkSet.isPending}
              className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 font-bold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {bulkSet.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                t("teacher_quiz_manage.banners.save_default_time")
              )}
            </button>
          </div>
        )}

        {questions.length > 0 && blankExpectedTimeCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {t("teacher_quiz_manage.banners.missing_expected_time", {
                count: blankExpectedTimeCount,
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

        {/* Bulk set-time / approve is authoring only — a published quiz is
            frozen, so hide the whole bar rather than leave dead controls. */}
        {!published && (
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
            onApprove={handleApproveBulk}
            approveValid={selectedIds.size > 0}
            approving={bulkApprove.isPending}
          />
        )}

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
              outcomes={outcomes}
              selected={selectedIds.has(question.id)}
              onToggleSelect={() => onToggleSelect(question.id)}
              onQueueDelete={onQueueDelete}
              published={published}
              onDirtyChange={handleDirtyChange}
            />
          ))
        )}

        {/* Add-question controls are authoring only — hidden on a published
            (frozen) quiz so no new questions can be seeded. */}
        {!published && (
        <div className="flex flex-wrap items-stretch gap-2">
          <button
            type="button"
            onClick={() => onAddQuestion("multiple_choice")}
            disabled={addPending}
            className="flex-1 min-w-[12rem] flex items-center justify-center gap-2 border-2 border-dashed border-m3-outline-variant/40 rounded-xl px-6 py-4 text-sm font-bold text-m3-on-surface-variant hover:border-m3-primary hover:text-m3-primary hover:bg-m3-primary/5 transition-all disabled:opacity-60 cursor-pointer"
          >
            {addPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t("teacher_quiz_manage.actions.add_question")}
          </button>
          {/* Phase 7: type picker — add a question of any supported type.
              Selecting a value seeds the right shape; the reset to "" keeps
              this a pure action control (not stateful). */}
          <select
            aria-label={t("teacher_quiz_manage.actions.add_question_of_type")}
            disabled={addPending}
            value=""
            onChange={(e) => {
              const type = e.target.value;
              if (type) void onAddQuestion(type);
              e.currentTarget.value = "";
            }}
            className="shrink-0 rounded-xl border-2 border-dashed border-m3-outline-variant/40 bg-m3-surface px-3 py-4 text-sm font-bold text-m3-on-surface-variant hover:border-m3-primary hover:text-m3-primary transition-all disabled:opacity-60 cursor-pointer"
          >
            <option value="">
              {t("teacher_quiz_manage.actions.add_other_type")}
            </option>
            <option value="true_false">
              {t("teacher_quiz_manage.type_editor.type_true_false")}
            </option>
            <option value="short_answer">
              {t("teacher_quiz_manage.type_editor.type_short_answer")}
            </option>
            <option value="numerical">
              {t("teacher_quiz_manage.type_editor.type_numerical")}
            </option>
            <option value="matching">
              {t("teacher_quiz_manage.type_editor.type_matching")}
            </option>
            <option value="ordering">
              {t("teacher_quiz_manage.type_editor.type_ordering")}
            </option>
          </select>
        </div>
        )}
      </div>

      <div className="col-span-12 lg:col-span-4 min-w-0">
        <div className="lg:sticky lg:top-[8.5rem] space-y-4">
          {/* AI generation / bank import / file import all SEED new questions,
              which a published quiz can't accept — hide the whole authoring
              panel when frozen. The read-only QuestionNavigator stays so the
              teacher can still jump between questions. */}
          {!published && (
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
              {t(
                "teacher_quiz_manage.ai_panel.import_from_bank",
                "Import from bank",
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onOpenImportExport}
              className="w-full gap-2"
            >
              <FileUp className="h-4 w-4" />
              {t("teacher_quiz_manage.ai_panel.import_export_file")}
            </Button>
          </div>
          )}

          {/* Quick question navigation — jumps (auto-scrolls) to a question
              card. Reuses the numbered-box design from the student quiz. */}
          <QuestionNavigator
            questions={questions}
            selectedIds={selectedIds}
            dirtyIds={dirtyIds}
          />
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
  onApprove,
  approveValid,
  approving,
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
  onApprove: () => void | Promise<void>;
  approveValid: boolean;
  approving: boolean;
}) {
  const { t } = useTranslation();
  if (totalQuestions === 0) return null;
  const hasSelection = selectedCount > 0;
  return (
    // Inline bulk-action bar (not sticky): it emphasizes (primary tint) only
    // when questions are selected; otherwise it stays a quiet neutral bar.
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-wrap items-center gap-3 shadow-glass transition-colors",
        hasSelection
          ? "border-m3-primary/30 bg-m3-primary-fixed/20"
          : "border-m3-outline-variant/20 bg-m3-surface-container-lowest",
      )}
    >
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
      {/* Compact seconds input: a narrow field with an inline "sec" suffix
          so it reads as a seconds input without the wide label eating space. */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative">
          <Input
            type="number"
            min={1}
            step={1}
            value={bulkSeconds}
            onChange={(e) => onBulkSecondsChange(e.target.value)}
            aria-label={t("teacher_quiz_manage.bulk_time.duration_seconds")}
            title={t("teacher_quiz_manage.bulk_time.duration_seconds")}
            className="bg-m3-surface text-sm w-20 pr-9 tabular-nums"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-m3-on-surface-variant">
            {t("teacher_quiz_manage.bulk_time.seconds_suffix")}
          </span>
        </div>
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
        <Button
          type="button"
          size="sm"
          disabled={!approveValid || approving}
          onClick={onApprove}
          className="gap-2 bg-emerald-600 text-white border-0 hover:bg-emerald-700"
        >
          {approving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {t("teacher_quiz_manage.bulk_time.approve_selected")}
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({
  quizId,
  question,
  outcomes,
  selected,
  onToggleSelect,
  onQueueDelete,
  published = false,
  onDirtyChange,
}: {
  quizId: string;
  question: QuizQuestionAuthoring;
  outcomes: CourseLearningOutcomeAuthoring[];
  selected: boolean;
  onToggleSelect: () => void;
  onQueueDelete: (item: PendingQuestionDelete) => void;
  /** Published quizzes are frozen — the mutating actions (Save / Approve /
   *  Regenerate / Delete) are hidden entirely rather than shown disabled,
   *  since the backend hard-rejects every edit with 409. */
  published?: boolean;
  /** Reports unsaved-edit state up to the navigator. */
  onDirtyChange?: (questionId: string, dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const updateQuestion = useUpdateQuizQuestion(quizId, question.id);
  const regenerate = useRegenerateQuestion(quizId, question.id);

  const [draft, setDraft] = useState(() => buildQuestionDraft(question));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraft(buildQuestionDraft(question));
  }, [question]);

  // Local edits not yet PATCHed.
  //
  // The baseline deliberately uses the RAW saved expected time, not
  // buildQuestionDraft's defaulted one. buildQuestionDraft pre-fills
  // DEFAULT_EXPECTED_SECONDS when the saved value is null, so comparing against
  // it would cancel the default out on both sides — the field would look
  // populated while the row stayed null, and the question wouldn't register as
  // unsaved. Baselining on the raw value makes that pre-filled default show up
  // as exactly what it is: an unsaved local edit.
  const isUnsaved = useMemo(() => {
    const savedSeconds =
      question.expected_response_time_ms == null
        ? null
        : Math.round(question.expected_response_time_ms / 1000);
    const savedBaseline = {
      ...buildQuestionDraft(question),
      expected_response_seconds: savedSeconds,
    };
    return JSON.stringify(draft) !== JSON.stringify(savedBaseline);
  }, [draft, question]);

  // Report dirtiness up so the navigator can show a Saved/Unsaved badge. The
  // draft itself stays local to the card (lifting it would re-render every
  // sibling card on each keystroke).
  useEffect(() => {
    onDirtyChange?.(question.id, isUnsaved);
  }, [question.id, isUnsaved, onDirtyChange]);

  // Unmount cleanup: a card that scrolls out of the list (or is deleted) must
  // not leave a stale "unsaved" flag behind in the parent.
  useEffect(
    () => () => {
      onDirtyChange?.(question.id, false);
    },
    [question.id, onDirtyChange],
  );

  const hasOptions =
    (question.question_type === "multiple_choice" ||
      question.question_type === "true_false") &&
    draft.options.length > 0;
  // Phase 7: multi-select is MCQ-only (true_false is always single-answer).
  // Read the DRAFT flag, not the saved row, so flipping the toggle switches the
  // option inputs to checkboxes immediately — before the teacher hits Save.
  const allowMultiCorrect =
    question.question_type === "multiple_choice" && !draft.single_answer;
  const correctAnswer = readCorrectAnswer(question);
  const blankCount =
    question.question_type === "fill_blank"
      ? countBlanks(question.prompt_text ?? "")
      : 0;
  const expectedSeconds =
    question.expected_response_time_ms == null
      ? null
      : Math.round(question.expected_response_time_ms / 1000);
  // Live validity of the DRAFT value, for inline field feedback while typing.
  // Distinct from hasInvalidExpectedTime(question), which reflects the SAVED
  // row and drives the navigator's error state.
  const draftTimeInvalid =
    draft.expected_response_seconds == null ||
    !Number.isFinite(draft.expected_response_seconds) ||
    draft.expected_response_seconds <= 0;

  async function handleSave(reviewStatus = draft.review_status) {
    if (!draft.prompt_text.trim()) {
      toast.error(t("teacher_quiz_manage.errors.prompt_required"));
      return;
    }
    // Expected response time is REQUIRED — the SR scheduler and pacing
    // analytics divide by it, so saving null/0 would produce a broken question
    // that the backend rejects at publish time anyway. Fail fast here with a
    // pointed message instead of letting it through to a publish-time 422.
    if (
      draft.expected_response_seconds == null ||
      !Number.isFinite(draft.expected_response_seconds) ||
      draft.expected_response_seconds <= 0
    ) {
      toast.error(t("teacher_quiz_manage.errors.expected_time_required"));
      return;
    }
    if (hasOptions) {
      if (draft.options.some((o) => !o.option_text.trim())) {
        toast.error(t("teacher_quiz_manage.errors.option_text_required"));
        return;
      }
      // Phase 7: the correct-count rule depends on the multi-select toggle.
      // Multi-select needs >= 1 correct (matching the backend validator);
      // single-answer still requires exactly 1.
      const correctCount = draft.options.filter((o) => o.is_correct).length;
      if (allowMultiCorrect) {
        if (correctCount < 1) {
          toast.error(t("teacher_quiz_manage.errors.at_least_one_correct"));
          return;
        }
      } else if (correctCount !== 1) {
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
        // bloom_level and expected_ef_ceiling are no longer teacher-editable
        // (removed from the question editor). This is a partial PATCH, so
        // omitting them leaves any existing backend values untouched.
        // Validated as required above, so this is always a positive integer.
        expected_response_time_ms:
          Math.max(1, Math.round(draft.expected_response_seconds)) * 1000,
        review_status: reviewStatus,
        learning_outcome_id: draft.learning_outcome_id || null,
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
        // Phase 7: type-specific answer fields. Sent per question type so the
        // backend persists the answer key (numerical/matching/ordering) or the
        // multi-select discriminator (multiple_choice). Omitted for types that
        // don't use them, leaving existing values untouched (partial PATCH).
        ...(question.question_type === "multiple_choice"
          ? { single_answer: draft.single_answer }
          : {}),
        ...((question.question_type as string) === "numerical"
          ? {
              numeric_answer:
                draft.numeric_answer.trim() === ""
                  ? null
                  : Number(draft.numeric_answer),
              numeric_tolerance:
                draft.numeric_tolerance.trim() === ""
                  ? 0
                  : Number(draft.numeric_tolerance),
            }
          : {}),
        ...((question.question_type as string) === "matching"
          ? {
              match_pairs: draft.match_pairs
                .filter((p) => p.left.trim() && p.right.trim())
                .map((p) => ({ left: p.left.trim(), right: p.right.trim() })),
            }
          : {}),
        ...((question.question_type as string) === "ordering"
          ? {
              ordering_sequence: draft.ordering_sequence
                .map((s) => s.trim())
                .filter((s) => s.length > 0),
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
        (err as Error).message || t("teacher_quiz_manage.toasts.regen_failed"),
      );
    }
  }

  return (
    <div
      id={`qcard-${question.id}`}
      // scroll-margin keeps the card clear of the sticky header when the
      // question navigator scrolls it into view.
      className={cn(
        "rounded-xl border bg-m3-surface p-4 space-y-3 scroll-mt-[9.5rem]",
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
          {t("teacher_quiz_manage.outcome.label", "Learning outcome")}
        </label>
        <select
          value={draft.learning_outcome_id ?? ""}
          onChange={(e) =>
            setDraft((current) => ({
              ...current,
              learning_outcome_id: e.target.value || null,
            }))
          }
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        >
          <option value="">
            {t("teacher_quiz_manage.outcome.none", "No outcome")}
          </option>
          {outcomes.map((outcome) => (
            <option key={outcome.id} value={outcome.id}>
              {`${"\u00A0".repeat((outcome.depth ?? 0) * 2)}L.O.${
                outcome.code ?? outcome.position
              } — ${
                outcome.outcome_text.length > 60
                  ? `${outcome.outcome_text.slice(0, 60)}…`
                  : outcome.outcome_text
              }`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t(
            "teacher_quiz_manage.editor.hint_label",
            "Hint (shown to learner on request)",
          )}
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
            'Optional. Only shown to learners if "Show hints" is enabled in Quiz Settings. Must not reveal the answer.',
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
              {/* Phase 7: honour the multi-select toggle. When multiple correct
                  answers are allowed the teacher needs checkboxes that toggle
                  independently; a radio group would silently clear the others
                  (and true_false is always single-answer). */}
              <input
                type={allowMultiCorrect ? "checkbox" : "radio"}
                name={
                  allowMultiCorrect ? undefined : `correct-${question.id}`
                }
                checked={option.is_correct}
                aria-label={t("teacher_quiz_manage.editor.mark_correct", {
                  key: option.option_key,
                })}
                onChange={() =>
                  setDraft((current) => ({
                    ...current,
                    options: current.options.map((o, j) =>
                      allowMultiCorrect
                        ? j === idx
                          ? { ...o, is_correct: !o.is_correct }
                          : o
                        : { ...o, is_correct: j === idx },
                    ),
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
            {t(
              "teacher_quiz_manage.editor.correct_answer_label",
              "Correct answer",
            )}
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

      <TypeSpecificAnswerEditor
        questionType={question.question_type}
        value={{
          single_answer: draft.single_answer,
          numeric_answer: draft.numeric_answer,
          numeric_tolerance: draft.numeric_tolerance,
          match_pairs: draft.match_pairs,
          ordering_sequence: draft.ordering_sequence,
        }}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
      />

      {/* Explanation comes before Configuration: it's the content-authoring
          field (what students see), so it sits with the question body; the
          Configuration block (difficulty / expected time) is metadata and
          follows it. */}
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

      <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-3 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-m3-secondary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-m3-secondary">
            {t("teacher_quiz_manage.editor.metadata_label", "Configuration")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
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
            <label
              htmlFor={`qexp-${question.id}`}
              className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant"
            >
              {t("teacher_quiz_manage.editor.t_exp_label", "Expected time (s)")}
              {/* Required marker — the SR scheduler divides by this value. */}
              <span className="ml-0.5 text-red-600" aria-hidden="true">
                *
              </span>
            </label>
            <Input
              id={`qexp-${question.id}`}
              type="number"
              min={1}
              max={600}
              required
              aria-invalid={draftTimeInvalid || undefined}
              aria-describedby={
                draftTimeInvalid ? `qexp-err-${question.id}` : undefined
              }
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
              className={cn(
                "h-8 bg-m3-surface text-xs",
                draftTimeInvalid &&
                  "border-red-500 focus-visible:ring-red-500/30",
              )}
            />
            {draftTimeInvalid && (
              <p
                id={`qexp-err-${question.id}`}
                className="text-[10px] font-semibold text-red-600"
              >
                {t("teacher_quiz_manage.errors.expected_time_required")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Published quiz = frozen. Hide the mutating actions entirely (Save /
          Approve / Regenerate / Delete) rather than showing them disabled —
          the backend rejects every edit with 409, so a greyed-out row would
          only invite dead clicks. The card stays visible read-only. */}
      {!published && (
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
            onClick={() => setConfirmDelete(true)}
            className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 ml-auto"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("common.delete")}
          </Button>
        </div>
      )}

      {/* Delete confirmation. On confirm we still route through the deferred
          queue + undo banner (the real DELETE fires when the 5s combo commits),
          but the teacher now has an explicit confirm step before the question
          disappears. */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-m3-surface p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-headline font-bold text-base text-m3-on-surface">
                  {t(
                    "teacher_quiz_manage.confirm_delete_question.title",
                    "Delete this question?",
                  )}
                </h2>
                <p className="text-sm text-m3-on-surface-variant">
                  {t(
                    "teacher_quiz_manage.confirm_delete_question.body",
                    "The question will be removed. You'll have a few seconds to undo before it's permanently deleted.",
                  )}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  handleDelete();
                }}
                className="bg-red-600 text-white hover:bg-red-700 border-0 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuestionDraft {
  prompt_text: string;
  hint_text: string;
  explanation: string;
  difficulty: string;
  expected_response_seconds: number | null;
  review_status: string;
  learning_outcome_id: string | null;
  options: Array<{
    id: string;
    option_key: string;
    option_text: string;
    is_correct: boolean;
  }>;
  // Phase 7: type-specific answer fields (editable for the expanded types).
  single_answer: boolean;
  numeric_answer: string;
  numeric_tolerance: string;
  match_pairs: Array<{ left: string; right: string }>;
  ordering_sequence: string[];
}

/** Pull the canonical correct answer out of an AI-generated question.
 *
 * MCQ + T/F store the answer in the option rows (``is_correct``); the
 * other types store it on ``original_generated_payload.correct_answer``
 * (string for short_answer, array of strings for fill_blank). The
 * payload field is read-only in the v1 authoring UI; teachers edit
 * stem + explanation, and regenerate to change the answer. */
function readCorrectAnswer(
  question: QuizQuestionAuthoring,
): string | string[] | null {
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

/**
 * Is this question's expected response time missing/invalid?
 *
 * The expected response time is REQUIRED: the spaced-repetition scheduler and
 * the pacing analytics both divide by it, so a null or non-positive value is a
 * broken question, not merely an incomplete one. A question can be pruned to
 * null by the AI generator or cleared by hand, so this is checked on the saved
 * row (what the backend will reject at publish) rather than on the draft.
 */
function hasInvalidExpectedTime(question: QuizQuestionAuthoring): boolean {
  const ms = question.expected_response_time_ms;
  return ms == null || ms <= 0;
}

/**
 * Per-question status shown in the navigator.
 *
 * These are ORTHOGONAL layers, not one enum — a question can be approved AND
 * unsaved AND focused at once. The navigator renders them on separate visual
 * channels so they never collide:
 *
 *   error      → red fill            (invalid/missing expected time; blocks publish)
 *   approved   → primary fill        (review_status === "approved")
 *   pending    → neutral fill + amber dot (awaiting review)
 *   unsaved    → amber ring + pencil corner (local edits not yet PATCHed)
 *   selected   → checkbox tick badge (bulk-action selection)
 *   focused    → primary ring + scale (scroll-spy / just-clicked)
 *
 * Precedence applies only to the FILL (a cell has one background): error wins
 * over approved wins over pending, because error is the state that blocks
 * publishing and must never be masked by an approved fill.
 */
export interface QuestionNavStatus {
  error: boolean;
  approved: boolean;
  unsaved: boolean;
  selected: boolean;
  focused: boolean;
}

function buildQuestionDraft(question: QuizQuestionAuthoring): QuestionDraft {
  return {
    prompt_text: question.prompt_text ?? "",
    hint_text: question.hint_text ?? "",
    explanation: question.explanation ?? "",
    difficulty: question.difficulty ?? "medium",
    // Default the expected response time to DEFAULT_EXPECTED_SECONDS when the
    // question has none, so new/AI-generated questions come pre-filled with a
    // sensible value instead of blank (teachers can still override or clear).
    expected_response_seconds:
      question.expected_response_time_ms == null
        ? DEFAULT_EXPECTED_SECONDS
        : Math.round(question.expected_response_time_ms / 1000),
    review_status: question.review_status ?? "pending",
    learning_outcome_id: question.learning_outcome_id ?? null,
    options: (question.options ?? []).map((o) => ({
      id: o.id,
      option_key: o.option_key,
      option_text: o.option_text,
      is_correct: o.is_correct,
    })),
    // Phase 7: type-specific answer fields (teacher-only; served on the
    // authoring schema). Held as strings in the draft for easy input binding.
    single_answer: question.single_answer ?? true,
    numeric_answer:
      question.numeric_answer == null ? "" : String(question.numeric_answer),
    numeric_tolerance:
      question.numeric_tolerance == null
        ? ""
        : String(question.numeric_tolerance),
    match_pairs: Array.isArray(question.match_pairs)
      ? question.match_pairs.map((p) => ({
          left: String(p.left ?? ""),
          right: String(p.right ?? ""),
        }))
      : [],
    ordering_sequence: Array.isArray(question.ordering_sequence)
      ? question.ordering_sequence.map((s) => String(s))
      : [],
  };
}

/* GenerateModal removed: the AI generator is now its own full-page route
   (src/routes/teacher/quiz-generate.tsx) reached via onOpenGenerator, since
   the form outgrew the dialog. QuizGenerationPanel is imported by that page. */

/**
 * A `<fieldset disabled>` wrapper for the sections frozen once published.
 * Grouping each locked SettingsSection in one of these disables every control
 * inside without threading `disabled` onto each input. When not locked it
 * renders a transparent passthrough so draft editing is unaffected.
 *
 * Declared at module scope on purpose. Nested inside SettingsTab, every
 * re-render created a NEW component function, so React saw a different element
 * type and remounted the whole subtree — discarding local state in children
 * (e.g. the review-options expand/collapse) on every keystroke or toggle.
 */
function LockableSection({
  locked,
  children,
}: {
  locked: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      disabled={locked}
      className="border-0 p-0 m-0 min-w-0 disabled:opacity-60"
    >
      {children}
    </fieldset>
  );
}

function SettingsTab({
  quizId,
  draft,
  setDraft,
  onSubmit,
  saving,
  dirty,
  onReset,
  locked = false,
}: {
  quizId: string;
  draft: SettingsDraft;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  dirty: boolean;
  onReset: () => void;
  /** Published quiz: freeze the non-student-safe sections. Title,
   *  description, schedule, and reminders stay editable. */
  locked?: boolean;
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

      <LockableSection locked={locked}>
      <SettingsSection title={t("teacher_quiz_manage.settings.scoring.title")}>
        <Field
          label={
            <span className="flex items-center justify-between">
              <span>
                {t("teacher_quiz_manage.settings.scoring.pass_score")}
              </span>
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
        <Field
          label={t("teacher_quiz_manage.settings.scoring.grading_method_label")}
          hint={t("teacher_quiz_manage.settings.scoring.grading_method_hint")}
        >
          <select
            value={draft.grading_method}
            onChange={(e) =>
              update(
                "grading_method",
                e.target.value as SettingsDraft["grading_method"],
              )
            }
            className="w-full sm:w-72 rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          >
            <option value="highest">
              {t("teacher_quiz_manage.settings.scoring.grading_method_highest")}
            </option>
            <option value="average">
              {t("teacher_quiz_manage.settings.scoring.grading_method_average")}
            </option>
            <option value="first">
              {t("teacher_quiz_manage.settings.scoring.grading_method_first")}
            </option>
            <option value="last">
              {t("teacher_quiz_manage.settings.scoring.grading_method_last")}
            </option>
          </select>
        </Field>
      </SettingsSection>
      </LockableSection>

      <LockableSection locked={locked}>
      <SettingsSection title={t("teacher_quiz_manage.settings.attempts.title")}>
        <ToggleRow
          label={t("teacher_quiz_manage.settings.attempts.allow_label")}
          description={t("teacher_quiz_manage.settings.attempts.allow_desc")}
          value={draft.allow_retakes}
          onChange={(v) => update("allow_retakes", v)}
        />
        {draft.allow_retakes && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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
      </LockableSection>

      {/* Schedule stays editable on a published quiz — extending a deadline
          or shifting the open/close window doesn't disrupt a live attempt. */}
      <SettingsSection
        title={t("teacher_quiz_manage.settings.schedule.title")}
        description={t("teacher_quiz_manage.settings.schedule.description")}
      >
        {/* All three date pickers share one 2-col grid so they line up on a
            common left edge and column width. The inputs are w-full so each
            fills its cell uniformly (previously "due" was a fixed sm:w-72,
            which broke alignment with the open/close fields above it). */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label={t("teacher_quiz_manage.settings.schedule.open_label")}
            hint={t("teacher_quiz_manage.settings.schedule.open_hint")}
          >
            <Input
              type="datetime-local"
              value={draft.available_from}
              onChange={(e) => update("available_from", e.target.value)}
              className="bg-m3-surface text-sm w-full"
            />
          </Field>
          <Field
            label={t("teacher_quiz_manage.settings.schedule.close_label")}
            hint={t("teacher_quiz_manage.settings.schedule.close_hint")}
          >
            <Input
              type="datetime-local"
              value={draft.available_until}
              onChange={(e) => update("available_until", e.target.value)}
              className="bg-m3-surface text-sm w-full"
            />
          </Field>
          <Field
            label={t("teacher_quiz_manage.settings.schedule.due_label")}
            hint={t("teacher_quiz_manage.settings.schedule.due_hint")}
          >
            <Input
              type="datetime-local"
              value={draft.due_at}
              onChange={(e) => update("due_at", e.target.value)}
              className="bg-m3-surface text-sm w-full"
            />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection title={t("teacher_quiz_manage.settings.behavior.title")}>
        {/* One row of four on wide screens — these are short, independent
            switches, so a single column wasted most of the width.

            The first three change how the quiz presents to a student and are
            frozen once published; reminders is a notification setting and
            stays editable. They can't be split across a `<fieldset disabled>`
            here without breaking the grid (the fieldset would be one grid
            item), so the lock is applied per card via `disabled`. */}
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <ToggleRow
            label={t("teacher_quiz_manage.settings.behavior.shuffle_q_label")}
            description={t(
              "teacher_quiz_manage.settings.behavior.shuffle_q_desc",
            )}
            value={draft.shuffle_questions}
            onChange={(v) => update("shuffle_questions", v)}
            disabled={locked}
          />
          <ToggleRow
            label={t("teacher_quiz_manage.settings.behavior.shuffle_o_label")}
            description={t(
              "teacher_quiz_manage.settings.behavior.shuffle_o_desc",
            )}
            value={draft.shuffle_options}
            onChange={(v) => update("shuffle_options", v)}
            disabled={locked}
          />
          <ToggleRow
            label={t("teacher_quiz_manage.settings.behavior.show_hints_label")}
            description={t(
              "teacher_quiz_manage.settings.behavior.show_hints_desc",
            )}
            value={draft.show_hints}
            onChange={(v) => update("show_hints", v)}
            disabled={locked}
          />
          <ToggleRow
            label={t("teacher_quiz_manage.settings.behavior.reminders_label")}
            description={t(
              "teacher_quiz_manage.settings.behavior.reminders_desc",
            )}
            value={draft.reminders_enabled}
            onChange={(v) => update("reminders_enabled", v)}
          />
        </div>
      </SettingsSection>

      {/* Review visibility, access/proctoring, overdue timing, overrides,
          feedback bands, and SM-2 spacing all change how the quiz is graded
          or presented under a live/finished attempt — frozen once published. */}
      <LockableSection locked={locked}>
      <div className="space-y-8">
      <SettingsSection
        title={t("teacher_quiz_manage.settings.review.title")}
        description={t("teacher_quiz_manage.settings.review.description")}
      >
        <ReviewOptionsMatrix
          value={draft.review_options}
          onChange={(next) => update("review_options", next)}
        />
      </SettingsSection>

      <SettingsSection
        title={t("teacher_quiz_manage.settings.access.title")}
        description={t("teacher_quiz_manage.settings.access.description")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("teacher_quiz_manage.settings.access.password_label")}
            hint={t("teacher_quiz_manage.settings.access.password_hint")}
          >
            <Input
              type="text"
              value={draft.require_password}
              onChange={(e) => update("require_password", e.target.value)}
              className="bg-m3-surface text-sm w-full"
              placeholder={t(
                "teacher_quiz_manage.settings.access.password_placeholder",
              )}
            />
          </Field>
          <Field
            label={t("teacher_quiz_manage.settings.access.subnet_label")}
            hint={t("teacher_quiz_manage.settings.access.subnet_hint")}
          >
            <Input
              type="text"
              value={draft.require_subnet}
              onChange={(e) => update("require_subnet", e.target.value)}
              className="bg-m3-surface text-sm w-full"
              placeholder="10.0.0.0/8, 192.168.1.5"
            />
          </Field>
        </div>
        <ToggleRow
          label={t("teacher_quiz_manage.settings.access.browser_security_label")}
          description={t(
            "teacher_quiz_manage.settings.access.browser_security_desc",
          )}
          value={draft.browser_security}
          onChange={(v) => update("browser_security", v)}
        />
      </SettingsSection>

      <SettingsSection
        title={t("teacher_quiz_manage.settings.timing.title")}
        description={t("teacher_quiz_manage.settings.timing.description")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("teacher_quiz_manage.settings.timing.overdue_label")}
            hint={t("teacher_quiz_manage.settings.timing.overdue_hint")}
          >
            <select
              value={draft.overdue_handling}
              onChange={(e) =>
                update(
                  "overdue_handling",
                  e.target.value as SettingsDraft["overdue_handling"],
                )
              }
              className="bg-m3-surface text-sm w-full rounded-lg border border-m3-outline-variant px-3 py-2"
            >
              <option value="autosubmit">
                {t("teacher_quiz_manage.settings.timing.overdue_autosubmit")}
              </option>
              <option value="graceperiod">
                {t("teacher_quiz_manage.settings.timing.overdue_graceperiod")}
              </option>
              <option value="autoabandon">
                {t("teacher_quiz_manage.settings.timing.overdue_autoabandon")}
              </option>
            </select>
          </Field>
          {draft.overdue_handling === "graceperiod" && (
            <Field
              label={t("teacher_quiz_manage.settings.timing.grace_label")}
              hint={t("teacher_quiz_manage.settings.timing.grace_hint")}
            >
              <Input
                type="number"
                min={1}
                value={draft.grace_period_seconds}
                onChange={(e) =>
                  update("grace_period_seconds", e.target.value)
                }
                className="bg-m3-surface text-sm w-full"
              />
            </Field>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title={t("teacher_quiz_manage.settings.overrides.title")}
        description={t("teacher_quiz_manage.settings.overrides.description")}
      >
        <OverridesPanel quizId={quizId} />
      </SettingsSection>

      <SettingsSection
        title={t("teacher_quiz_manage.settings.feedback.title")}
        description={t("teacher_quiz_manage.settings.feedback.description")}
      >
        <FeedbackBandsPanel quizId={quizId} />
      </SettingsSection>

      <SettingsSection
        title={t("teacher_quiz_manage.settings.spacing.title")}
        description={t("teacher_quiz_manage.settings.spacing.description")}
      >
        <MasterySelector
          values={{
            initial_ef: draft.initial_ef,
            min_ef_for_unlock: draft.min_ef_for_unlock,
            coverage_threshold: draft.coverage_threshold,
          }}
          onPatch={(patch) =>
            setDraft((current) =>
              current ? { ...current, ...patch } : current,
            )
          }
        />
      </SettingsSection>
      </div>
      </LockableSection>

      {/* Sticky action bar: pins to the bottom of the viewport so the teacher
          can save from anywhere in a long form without scrolling back down.
          It only becomes an active "unsaved changes" bar when the draft
          differs from what's saved; otherwise Save is disabled and it stays
          quiet. Negative margins cancel the form's padding so the bar spans
          the full card width and reads as a footer. z-10 keeps it under the
          global ContentTopBar (frontend/AGENTS.md). */}
      <div className="sticky bottom-0 z-10 -mx-6 lg:-mx-8 -mb-6 lg:-mb-8 mt-8">
        <div
          className={cn(
            "flex items-center justify-end gap-3 px-6 lg:px-8 py-4 border-t backdrop-blur-md transition-colors rounded-b-xl",
            dirty
              ? "border-m3-primary/30 bg-m3-primary-fixed/20"
              : "border-m3-outline-variant/20 bg-m3-surface-container-lowest/80",
          )}
        >
          {dirty && (
            <span className="mr-auto text-xs font-semibold text-m3-primary">
              {t("teacher_quiz_manage.settings.unsaved_changes")}
            </span>
          )}
          {dirty && (
            <Button
              type="button"
              variant="ghost"
              onClick={onReset}
              disabled={saving}
              className="gap-2"
            >
              {t("teacher_quiz_manage.settings.reset_button")}
            </Button>
          )}
          <Button
            type="submit"
            disabled={saving || !dirty}
            className="gap-2 gradient-primary text-white border-0 hover:shadow-ai-glow disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("teacher_quiz_manage.settings.save_button")}
          </Button>
        </div>
      </div>
    </form>
  );
}

function QuestionNavigator({
  questions,
  selectedIds,
  dirtyIds,
  onJump,
}: {
  questions: QuizQuestionAuthoring[];
  /** Bulk-action selection, rendered as a corner tick badge. */
  selectedIds?: Set<string>;
  /** Questions with unsaved local edits, rendered as an amber ring + pencil. */
  dirtyIds?: Set<string>;
  /** Notified when a cell is clicked (so the parent can also select/focus). */
  onJump?: (questionId: string) => void;
}) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  // Suppress scroll-spy briefly after a click so the highlight doesn't
  // flicker through intermediate cards during the smooth scroll.
  const suppressSpyUntil = useRef<number>(0);

  const scrollToQuestion = useCallback(
    (id: string) => {
      const el = document.getElementById(`qcard-${id}`);
      if (!el) return;
      suppressSpyUntil.current = Date.now() + 700;
      setActiveId(id);
      onJump?.(id);
      const reduceMotion =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    },
    [onJump],
  );

  // Scroll-spy: highlight the last card whose top has scrolled above a line
  // just below the sticky header (matches the card's scroll-mt offset).
  useEffect(() => {
    if (questions.length === 0) return;
    let frame = 0;
    const recompute = () => {
      frame = 0;
      if (Date.now() < suppressSpyUntil.current) return;
      const line = 160; // ~9.5rem sticky-header clearance + a little margin
      let current: string | null = questions[0]?.id ?? null;
      for (const q of questions) {
        const el = document.getElementById(`qcard-${q.id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= line) current = q.id;
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(recompute);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    recompute();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [questions]);

  if (questions.length === 0) return null;

  // Mirrors the per-cell rule: an unsaved pre-filled default isn't an error.
  const errorCount = questions.filter(
    (q) => hasInvalidExpectedTime(q) && !(dirtyIds?.has(q.id) ?? false),
  ).length;
  const unsavedCount = dirtyIds
    ? questions.filter((q) => dirtyIds.has(q.id)).length
    : 0;

  return (
    <div className="rounded-xl border border-m3-secondary/10 bg-m3-surface-container-low p-5 shadow-glass space-y-3">
      <div className="flex items-center justify-between gap-2">
        {/* The status legend is a hover popover on the title rather than a block
            under the grid: six swatches of permanent chrome crowded the sticky
            sidebar, and it's reference material you consult once, not something
            you need on screen continuously. */}
        <PreviewCard.Root>
          <PreviewCard.Trigger
            render={
              <h2 className="flex cursor-help items-center gap-1.5 font-headline font-bold text-sm text-m3-on-surface">
                {t("teacher_quiz_manage.question_nav.title")}
                <HelpCircle
                  className="h-3.5 w-3.5 text-m3-on-surface-variant"
                  aria-hidden="true"
                />
              </h2>
            }
          />
          <PreviewCard.Portal>
            <PreviewCard.Positioner side="right" align="start" sideOffset={10}>
              <PreviewCard.Popup
                className={cn(
                  // z-40 to clear the sticky top bar (z-20); the sidebar is the
                  // only thing above it (see frontend/AGENTS.md).
                  "z-40 w-64 rounded-xl border border-m3-outline-variant/40 bg-m3-surface p-4 shadow-2xl outline-none",
                  "transition-all duration-150",
                  "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
                  "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
                )}
              >
                <p className="mb-2.5 font-headline text-sm font-bold text-m3-on-surface">
                  {t("teacher_quiz_manage.question_nav.legend_title")}
                </p>
                {/* Single column at a readable size — the old 2-col 10px grid
                    was the unreadable part. */}
                <ul className="space-y-2 text-sm text-m3-on-surface-variant">
                  <li className="flex items-center gap-2.5">
                    <span className="h-4 w-4 shrink-0 rounded bg-m3-primary" />
                    {t("teacher_quiz_manage.question_nav.status_approved")}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="relative h-4 w-4 shrink-0 rounded bg-m3-surface-container-high">
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                    {t("teacher_quiz_manage.question_nav.status_pending")}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-4 w-4 shrink-0 rounded bg-red-600" />
                    {t("teacher_quiz_manage.question_nav.status_error")}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-4 w-4 shrink-0 rounded bg-m3-surface-container-high ring-2 ring-amber-500" />
                    {t("teacher_quiz_manage.question_nav.status_unsaved")}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-4 w-4 shrink-0 rounded bg-m3-surface-container-high ring-2 ring-offset-1 ring-m3-primary" />
                    {t("teacher_quiz_manage.question_nav.status_focused")}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="relative h-4 w-4 shrink-0 rounded bg-m3-surface-container-high">
                      <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-m3-secondary" />
                    </span>
                    {t("teacher_quiz_manage.question_nav.status_selected")}
                  </li>
                </ul>
              </PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
        {/* Roll-up counts for the two states that need action. */}
        <div className="flex items-center gap-1.5">
          {errorCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              {t("teacher_quiz_manage.question_nav.error_count", {
                count: errorCount,
              })}
            </span>
          )}
          {unsavedCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {t("teacher_quiz_manage.question_nav.unsaved_count", {
                count: unsavedCount,
              })}
            </span>
          )}
        </div>
      </div>
      {/* Numbered grid — reuses the student QuizSummaryCard box design.
          Inner-scrollable so a quiz with many questions doesn't blow out
          the sticky sidebar height. */}
      <div className="max-h-[22rem] overflow-y-auto overflow-x-hidden">
        <div className="grid grid-cols-6 gap-1.5 p-1.5">
          {questions.map((question, index) => {
            // Six orthogonal status layers, each on its own visual channel so
            // they can coexist on one cell (see QuestionNavStatus).
            const focused = question.id === activeId;
            const approved = question.review_status === "approved";
            const unsaved = dirtyIds?.has(question.id) ?? false;
            // A pre-filled-but-unsaved default is NOT an error — the value is
            // right there in the editor, it just hasn't been persisted. The
            // unsaved ring already communicates that, so flag an error only when
            // the row has no time AND there are no pending edits to save.
            const error = hasInvalidExpectedTime(question) && !unsaved;
            const selected = selectedIds?.has(question.id) ?? false;
            const pending = !approved && !error;

            // FILL is exclusive (one background per cell): error > approved >
            // pending. Error must never be masked by an approved fill, since
            // it's the state that blocks publishing.
            const fill = error
              ? "bg-red-600 text-white hover:bg-red-500"
              : approved
                ? "bg-m3-primary text-white hover:bg-m3-primary/90"
                : "bg-m3-surface-container-high text-m3-outline hover:bg-m3-surface-container-highest";

            // RING is exclusive too (focus outranks unsaved, since focus is
            // transient and needs to be unmistakable).
            const ring = focused
              ? "ring-2 ring-offset-1 ring-m3-primary scale-105 z-10"
              : unsaved
                ? "ring-2 ring-amber-500"
                : "";

            const statusWords = [
              error
                ? t("teacher_quiz_manage.question_nav.status_error")
                : approved
                  ? t("teacher_quiz_manage.question_nav.status_approved")
                  : t("teacher_quiz_manage.question_nav.status_pending"),
              unsaved
                ? t("teacher_quiz_manage.question_nav.status_unsaved")
                : t("teacher_quiz_manage.question_nav.status_saved"),
              selected
                ? t("teacher_quiz_manage.question_nav.status_selected")
                : null,
            ].filter(Boolean);

            return (
              <button
                key={question.id}
                type="button"
                onClick={() => scrollToQuestion(question.id)}
                aria-current={focused ? "location" : undefined}
                aria-label={`${index + 1}. ${statusWords.join(", ")}`}
                title={`${index + 1}. ${statusWords.join(" · ")}${
                  question.prompt_text ? `\n${question.prompt_text}` : ""
                }`}
                className={cn(
                  "aspect-square w-full flex items-center justify-center rounded-lg font-bold text-sm relative cursor-pointer",
                  "transition-all duration-150",
                  fill,
                  ring,
                )}
              >
                {index + 1}

                {/* PENDING — amber dot, top-right. Only when there's no error
                    (an error cell is already fully red; a dot would be noise). */}
                {pending && (
                  <span
                    className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-500"
                    aria-hidden="true"
                  />
                )}

                {/* ERROR — warning glyph, top-right, on top of the red fill. */}
                {error && (
                  <AlertTriangle
                    className="absolute top-0 right-0 h-2.5 w-2.5"
                    aria-hidden="true"
                  />
                )}

                {/* UNSAVED — pencil, bottom-right. Pairs with the amber ring so
                    the state reads even for colour-blind users. */}
                {unsaved && (
                  <Pencil
                    className={cn(
                      "absolute bottom-0 right-0 h-2 w-2",
                      error || approved ? "text-white" : "text-amber-600",
                    )}
                    aria-hidden="true"
                  />
                )}

                {/* SELECTED — tick badge, top-left. Distinct corner from every
                    other marker so bulk-selection never collides with status. */}
                {selected && (
                  <span
                    className="absolute -top-1 -left-1 flex h-3 w-3 items-center justify-center rounded-full bg-m3-secondary text-white shadow-sm"
                    aria-hidden="true"
                  >
                    <Check className="h-2 w-2" strokeWidth={4} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
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

/**
 * A single on/off setting rendered as a whole-card toggle.
 *
 * The entire card is the control (not a small switch at the far right), so the
 * click target matches the text you just read and state is legible at a glance:
 * ON tints the card blue and shows a filled check, OFF stays neutral with an
 * empty outline. `role="switch"` + `aria-checked` keeps it announced as a
 * toggle rather than a plain button.
 *
 * Locking works two ways: being a real <button> it inherits `disabled` from an
 * ancestor `<fieldset disabled>` (LockableSection) for free, and the explicit
 * `disabled` prop covers layouts where that wrapper isn't available — e.g. the
 * Behavior grid, where a fieldset around a subset of cards would collapse into
 * a single grid item and break the 4-up row.
 */
function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  /** Set directly when the card can't sit inside a `<fieldset disabled>` —
   *  e.g. in a grid where locked and unlocked cards are siblings. */
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn(
        // h-full so cards in the same grid row match height even when one
        // description wraps to more lines than the others.
        "group flex h-full w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/40",
        "disabled:cursor-not-allowed disabled:opacity-60",
        value
          ? "border-m3-primary/40 bg-m3-primary/[0.07]"
          : "border-m3-outline-variant/25 bg-m3-surface-container-lowest hover:bg-m3-surface-container-high",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          value
            ? "border-m3-primary bg-m3-primary text-white"
            : "border-m3-outline-variant/60 bg-m3-surface",
        )}
      >
        {value && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-sm font-bold",
            value ? "text-m3-primary" : "text-m3-on-surface",
          )}
        >
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-m3-on-surface-variant">
          {description}
        </span>
      </span>
    </button>
  );
}

function PreviewTab({
  quiz,
  questions,
  onEditQuestion,
  onQueueDelete,
}: {
  quiz: QuizAuthoring;
  questions: QuizQuestionAuthoring[];
  /** Jump to this question in the Questions editor tab. */
  onEditQuestion: (questionId: string) => void;
  /** Queue this question for deletion (deferred + undo). */
  onQueueDelete: (item: PendingQuestionDelete) => void;
}) {
  const { t } = useTranslation();
  // Preview mirrors the student experience: only approved questions are
  // shown, matching the backend approved-only filter on the taking/published
  // surfaces. Pending/rejected drafts never appear here.
  const approvedQuestions = questions.filter(
    (q) => q.review_status === "approved",
  );
  return (
    <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl p-6 lg:p-8 space-y-6 shadow-glass">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-headline font-extrabold text-xl text-m3-on-surface">
            {t("teacher_quiz_manage.preview.title")}
          </h2>
          <p className="text-sm text-m3-on-surface-variant mt-1">
            {t("teacher_quiz_manage.preview.description", {
              title: quiz.title,
            })}
          </p>
        </div>
        <Badge className="border border-m3-outline-variant/40 bg-m3-surface-container-low text-m3-on-surface-variant rounded-full text-[11px] font-medium px-3 py-1 self-start sm:self-auto">
          {t("teacher_quiz_manage.preview.read_only")}
        </Badge>
      </div>

      {approvedQuestions.length === 0 ? (
        <div className="text-center py-16 text-m3-on-surface-variant space-y-1">
          <HelpCircle className="h-8 w-8 mx-auto text-m3-outline-variant" />
          <p className="text-base font-bold">
            {t("teacher_quiz_manage.empty.no_questions_title")}
          </p>
          <p className="text-sm">
            {t("teacher_quiz_manage.preview.empty_approved_body")}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {approvedQuestions.map((question, idx) => (
            <PreviewQuestion
              key={question.id}
              index={idx}
              question={question}
              onEditQuestion={onEditQuestion}
              onQueueDelete={onQueueDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewQuestion({
  index,
  question,
  onEditQuestion,
  onQueueDelete,
}: {
  index: number;
  question: QuizQuestionAuthoring;
  onEditQuestion: (questionId: string) => void;
  onQueueDelete: (item: PendingQuestionDelete) => void;
}) {
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasOptions =
    (question.question_type === "multiple_choice" ||
      question.question_type === "true_false") &&
    question.options.length > 0;
  const correctAnswer = readCorrectAnswer(question);

  function handleDelete() {
    const prompt = (question.prompt_text ?? "").trim();
    onQueueDelete({
      id: question.id,
      label: prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt,
    });
  }

  return (
    <div className="rounded-xl bg-m3-surface-container-low border border-m3-outline-variant/15 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="shrink-0 h-7 w-7 rounded-full gradient-primary text-white flex items-center justify-center text-xs font-extrabold">
          {index + 1}
        </span>
        <p className="flex-1 text-sm font-semibold text-m3-on-surface leading-relaxed">
          {(question.outcome_code ?? question.outcome_position) != null && (
            <span className="mr-1.5 inline-flex items-center rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-bold text-violet-600 align-middle">
              (L.O.{question.outcome_code ?? question.outcome_position})
            </span>
          )}
          {question.prompt_text || (
            <span className="italic text-m3-on-surface-variant">
              {t("teacher_quiz_manage.preview.no_content")}
            </span>
          )}
        </p>
        {/* Teacher-only preview actions: jump to this question in the editor,
            or delete it (deferred + undo, gated by a confirm dialog). */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onEditQuestion(question.id)}
            className="gap-1.5 h-8 px-2.5"
            title={t("teacher_quiz_manage.preview.edit_question", "Edit")}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="text-xs">
              {t("teacher_quiz_manage.preview.edit_question", "Edit")}
            </span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            className="gap-1.5 h-8 px-2.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
            title={t("common.delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="text-xs">{t("common.delete")}</span>
          </Button>
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
                  {t(
                    "teacher_quiz_manage.confirm_delete_question.title",
                    "Delete this question?",
                  )}
                </h2>
                <p className="text-sm text-m3-on-surface-variant">
                  {t(
                    "teacher_quiz_manage.confirm_delete_question.body",
                    "The question will be removed. You'll have a few seconds to undo before it's permanently deleted.",
                  )}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  handleDelete();
                }}
                className="bg-red-600 text-white hover:bg-red-700 border-0 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}

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
