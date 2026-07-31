import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Eye,
  HelpCircle,
  ListChecks,
  Loader2,
  LockIcon,
  RefreshCw,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { ApiError } from "@/lib/api/client";
import {
  useAddQuizQuestion,
  useDeleteQuiz,
  usePatchQuiz,
  usePublishQuiz,
  useQuizAuthoring,
  usePendingQuestionDeletes,
} from "@/lib/api/hooks/quizzes";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/teacher-courses";
import { useTeacherCourseOutcomes } from "@/lib/api/hooks/courses";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import { cn } from "@/lib/utils";
import {
  draftFromQuiz,
  localInputToIso,
  integerOrNull,
  decimalOrNull,
} from "../_components/quiz-manage/helpers";
import type { SettingsDraft, TabKey } from "../_components/quiz-manage/types";
import { QuestionBankModal } from "../_components/question-bank-modal";
import { ImportExportPanel } from "../_components/quiz-manage/ImportExportPanel";
import { QuestionsTab } from "../_components/quiz-manage/QuestionsTab";
import { SettingsTab } from "../_components/quiz-manage/SettingsTab";
import { PreviewTab } from "../_components/quiz-manage/PreviewTab";

// Tab order: Settings first (configure the quiz), then Questions (author the
// content), then Preview (see it as a student). Matches the natural authoring
// flow teachers follow.
const TAB_KEYS: ReadonlyArray<TabKey> = ["settings", "questions", "preview"];

// Icon per tab — used for the condensed icon-only vertical rail that the tab
// strip morphs into once it sticks under the global top bar.
const TAB_ICONS: Record<TabKey, React.ComponentType<{ className?: string }>> = {
  questions: ListChecks,
  settings: Settings,
  preview: Eye,
};

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

  // Unsaved-work guard for tab switches. Two sources of pending edits:
  //   - the Settings draft (local until Save settings)
  //   - any question card with unsaved edits, reported up by QuestionsTab
  // Switching tabs unmounts the editor, so without this a half-finished edit
  // vanished silently — including the Questions -> Preview jump.
  const [dirtyQuestionCount, setDirtyQuestionCount] = useState(0);
  const settingsDirty =
    draft != null &&
    quiz != null &&
    JSON.stringify(draft) !== JSON.stringify(draftFromQuiz(quiz));
  const hasUnsavedWork =
    (tab === "settings" && settingsDirty) ||
    (tab === "questions" && dirtyQuestionCount > 0);
  const leaveGuard = useUnsavedChangesGuard(hasUnsavedWork);

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
                ? // Stays in-flow inside the solid toolbar band — icon-only to
                  // stay compact, but horizontal and never floating over content.
                  "border border-transparent"
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
                  onClick={() => leaveGuard.run(() => setTab(key))}
                  aria-pressed={active}
                  aria-label={label}
                  title={actionsStuck ? label : undefined}
                  className={cn(
                    "rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center border",
                    actionsStuck ? "h-10 w-10" : "px-4 py-2 text-sm gap-2",
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
            onDirtyCountChange={setDirtyQuestionCount}
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
          dirty={settingsDirty}
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
      {/* Long page — the Questions tab stacks every question card, so a
          20-question quiz scrolls a long way from the tab strip and actions.
          Lifted above the pending-delete undo snackbar while that's showing:
          the snackbar is bottom-centre but wide enough to reach under a
          bottom-right button, and both sit at z-30. */}
      <ScrollToTop
        className={pendingDeletes.comboCount > 0 ? "bottom-24" : undefined}
      />
      {leaveGuard.dialog}
    </div>
  );
}
