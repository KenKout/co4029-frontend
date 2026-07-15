import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Clock,
  Flag,
  Lightbulb,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardCooldownBadge } from "@/components/ui/card-cooldown-badge";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { ApiError } from "@/lib/api/client";
import { useCourseBySlug } from "@/lib/api/hooks/courses";
import {
  useMyQuizAttempts,
  useStartQuizAttempt,
  useStudentQuiz,
  useSubmitQuizAnswer,
  useSubmitQuizAttempt,
} from "@/lib/api/hooks/quizzes";
import { useCardCooldown } from "@/lib/api/cooldown";
import { isApiErrorCode } from "@/lib/api/error-codes";
import { QuestionRenderer } from "@/routes/_components/QuestionRenderer";
import type {
  QuizAttemptRead,
  QuizForTakingPublic,
  QuizPublic,
  QuizQuestionPublic,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

type QuestionState = "completed" | "active" | "flagged" | "pending";

interface QuestionStatus {
  selectedOptionId: string | null;
  answerText: string | null;
  flagged: boolean;
  hintViewed: boolean;
  savedToServer: boolean;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function hasAnswer(status: QuestionStatus): boolean {
  return status.selectedOptionId !== null || (status.answerText ?? "").length > 0;
}

function questionState(idx: number, activeIdx: number, status: QuestionStatus): QuestionState {
  if (status.flagged) return "flagged";
  if (hasAnswer(status)) return "completed";
  if (idx === activeIdx) return "active";
  return "pending";
}

function extractDetailString(err: unknown, field: string): string | null {
  if (!(err instanceof ApiError)) return null;
  const parsed = err.parsedBody;
  if (!parsed || typeof parsed !== "object") return null;
  const detail = (parsed as { detail?: unknown }).detail;
  if (!detail || typeof detail !== "object") return null;
  const value = (detail as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

function extractRetryAt(err: unknown): string | null {
  return extractDetailString(err, "retry_available_at");
}

function HintDialog({
  open,
  onOpenChange,
  hintText,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hintText: string;
}) {
  const { t } = useTranslation();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "transition-opacity duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-m3-outline-variant/30 bg-m3-surface p-6 shadow-2xl",
            "outline-none",
            "transition-all duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-white shadow-ai-glow shrink-0">
                <Lightbulb className="h-5 w-5" />
              </div>
              <DialogPrimitive.Title className="font-headline text-base font-bold text-m3-on-surface">
                {t("course_quiz.actions.show_hint")}
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close
              render={
                <Button variant="ghost" size="icon-sm" aria-label={t("course_quiz.actions.close_hint", "Close")} />
              }
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="mt-4 text-sm text-m3-on-surface-variant leading-relaxed">
            {hintText}
          </DialogPrimitive.Description>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function QuizStudyModeCard({
  allowRetakes,
  maxAttempts,
  showHints,
  cooldownHours,
}: {
  allowRetakes: boolean;
  maxAttempts: number | null | undefined;
  showHints: boolean;
  cooldownHours: number | null | undefined;
}) {
  const { t } = useTranslation();
  return (
    <GlassCard className="p-6">
      <h4 className="font-headline font-bold text-m3-primary text-sm mb-4">
        {t("course_quiz.sections.config")}
      </h4>
      <div className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-4">
          <span className="text-m3-on-surface-variant">
            {t("course_quiz.labels.hint")}
          </span>
          <span className="font-semibold text-m3-on-surface">
            {showHints
              ? t("course_quiz.values.hint_available")
              : t("course_quiz.values.hint_off")}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-m3-on-surface-variant">
            {t("course_quiz.labels.retake")}
          </span>
          <span className="font-semibold text-m3-on-surface">
            {allowRetakes
              ? maxAttempts != null
                ? t("course_quiz.values.retake_max_attempts", { count: maxAttempts })
                : t("course_quiz.values.allowed")
              : t("course_quiz.values.disallowed")}
          </span>
        </div>
        {cooldownHours != null && cooldownHours > 0 && (
          <div className="flex items-start justify-between gap-4">
            <span className="text-m3-on-surface-variant">
              {t("course_quiz.labels.cooldown")}
            </span>
            <span className="font-semibold text-m3-on-surface">
              {t("course_quiz.values.cooldown_hours", { hours: cooldownHours })}
            </span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function QuizIntroPanel({
  quiz,
  attempts,
  onStart,
  starting,
  slug,
}: {
  quiz: QuizPublic;
  attempts: QuizAttemptRead[];
  onStart: () => void;
  starting: boolean;
  slug: string;
}) {
  const { t } = useTranslation();
  const completed = attempts.filter((a) => a.status === "submitted" || a.status === "graded").length;
  const passingScore = Math.round(Number(quiz.passing_score_percent));
  const maxAttemptsReached =
    quiz.max_attempts != null && completed >= quiz.max_attempts;
  const noRetakesLeft = completed > 0 && !quiz.allow_retakes;
  const blocked = maxAttemptsReached || noRetakesLeft;

  // Most recent attempts first; in_progress filtered out (review only after submit)
  const reviewableAttempts = [...attempts]
    .filter((a) => a.status === "submitted" || a.status === "graded")
    .sort((a, b) => b.attempt_number - a.attempt_number);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3 flex-wrap -ml-3">
        <Link to="/courses/$slug/learn" params={{ slug }}>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-m3-on-surface-variant hover:text-m3-primary gap-1.5 text-xs font-bold px-3"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("course_quiz.actions.back_to_course")}
          </Button>
        </Link>
      </div>

      <div className="w-full space-y-6">
        <GlassCard className="p-8 sm:p-10 text-center">
        <h1 className="font-headline font-extrabold text-3xl text-m3-primary mb-3">
          {quiz.title}
        </h1>
        {quiz.description && (
          <p className="text-m3-on-surface-variant mb-6">{quiz.description}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
          <div className="rounded-xl bg-m3-surface-container-low p-4">
            <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
              {t("course_quiz.labels.passing_score")}
            </span>
            <span className="text-xl font-black font-headline text-m3-primary">
              {passingScore}%
            </span>
          </div>
          <div className="rounded-xl bg-m3-surface-container-low p-4">
            <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
              {t("course_quiz.labels.time")}
            </span>
            <span className="text-xl font-black font-headline text-m3-on-surface">
              {quiz.time_limit_seconds
                ? formatTime(quiz.time_limit_seconds)
                : t("course_quiz.values.no_limit")}
            </span>
          </div>
          <div className="rounded-xl bg-m3-surface-container-low p-4">
            <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
              {t("course_quiz.labels.attempts")}
            </span>
            <span className="text-xl font-black font-headline text-m3-secondary">
              {completed}
              {quiz.max_attempts != null && (
                <span className="text-sm text-m3-outline-variant font-medium">
                  /{quiz.max_attempts}
                </span>
              )}
            </span>
          </div>
        </div>

        {blocked ? (
          <div className="rounded-xl bg-m3-surface-container-low px-4 py-3 text-sm text-m3-on-surface-variant">
            {noRetakesLeft && t("course_quiz.messages.no_retakes")}
            {maxAttemptsReached &&
              ` ${t("course_quiz.messages.max_attempts_reached", { count: quiz.max_attempts ?? 0 })}`}
          </div>
        ) : (
          <Button
            onClick={onStart}
            disabled={starting}
            className="gradient-primary text-white rounded-xl font-bold gap-2 px-8 py-3 h-auto"
          >
            {starting
              ? t("course_quiz.actions.starting")
              : t("course_quiz.actions.start")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </GlassCard>

      {reviewableAttempts.length > 0 && (
        <GlassCard className="p-6 sm:p-8">
          <h2 className="font-headline font-bold text-base text-m3-on-surface mb-4">
            {t("course_quiz.history.title")}
          </h2>
          <div className="space-y-2">
            {reviewableAttempts.map((a) => {
              const score =
                a.score_percent != null ? Number(a.score_percent) : null;
              const passed = a.passed === true;
              return (
                <Link
                  key={a.id}
                  to="/courses/$slug/quiz/$quizId/attempts/$attemptId"
                  params={{ slug, quizId: quiz.id, attemptId: a.id }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-m3-surface-container-low hover:bg-m3-surface-container transition-colors group"
                >
                  <span className="text-xs font-headline font-black text-m3-secondary tabular-nums shrink-0 w-8">
                    #{a.attempt_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-m3-on-surface">
                        {score != null
                          ? `${score.toFixed(0)}%`
                          : t("course_quiz.history.no_score")}
                      </span>
                      {a.passed != null && (
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                            passed
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700",
                          )}
                        >
                          {passed
                            ? t("course_quiz.history.passed")
                            : t("course_quiz.history.failed")}
                        </span>
                      )}
                    </div>
                    {a.submitted_at && (
                      <p className="text-xs text-m3-on-surface-variant mt-0.5">
                        {new Date(a.submitted_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-bold text-m3-primary group-hover:underline shrink-0">
                    {t("course_quiz.history.review")}
                  </span>
                </Link>
              );
            })}
          </div>
        </GlassCard>
      )}
      </div>
    </div>
  );
}

function QuestionSubmitButton({
  isLastQuestion,
  isSavedAnswer,
  hasSelection,
  isSavingAnswer,
  isFinalSubmitting,
  cooldownRetryAt: cooldownAt,
  onSaveNext,
  onFinalSubmit,
}: {
  isLastQuestion: boolean;
  isSavedAnswer: boolean;
  hasSelection: boolean;
  isSavingAnswer: boolean;
  isFinalSubmitting: boolean;
  cooldownRetryAt: string | null;
  onSaveNext: () => void;
  onFinalSubmit: () => void;
}) {
  const { t } = useTranslation();
  const cooldown = useCardCooldown(cooldownAt);
  const cooldownActive = !!cooldownAt && !cooldown.isExpired;
  const disabled =
    !hasSelection || isSavingAnswer || isFinalSubmitting || cooldownActive;

  if (isLastQuestion) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {cooldownActive && <CardCooldownBadge retryAt={cooldownAt} />}
        <Button
          onClick={onFinalSubmit}
          disabled={disabled}
          className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow px-6 py-3 h-auto hover:opacity-90 active:scale-95 transition-all"
        >
          {isFinalSubmitting
            ? t("course_quiz.actions.submitting")
            : isSavingAnswer
              ? t("course_quiz.actions.saving")
              : t("course_quiz.actions.submit")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {cooldownActive && <CardCooldownBadge retryAt={cooldownAt} />}
      <Button
        onClick={onSaveNext}
        disabled={disabled}
        className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow px-6 py-3 h-auto hover:opacity-90 active:scale-95 transition-all"
      >
        {isSavingAnswer
          ? t("course_quiz.actions.saving")
          : isSavedAnswer
            ? t("course_quiz.actions.next")
            : t("course_quiz.actions.save_and_continue")}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function CourseQuizPage() {
  const { t } = useTranslation();
  const { slug, quizId } = useParams({ strict: false }) as { slug: string; quizId: string };

  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const { data: quiz, isLoading: quizLoading } = useStudentQuiz(quizId);
  const { data: attempts = [], isLoading: attemptsLoading } = useMyQuizAttempts(quizId);

  const startAttempt = useStartQuizAttempt(quizId);

  const [taking, setTaking] = useState<QuizForTakingPublic | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [statuses, setStatuses] = useState<QuestionStatus[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submittedSummary, setSubmittedSummary] = useState<QuizAttemptRead | null>(null);
  const [perQuestionCooldown, setPerQuestionCooldown] = useState<Record<string, string>>({});
  const [hintDialogOpen, setHintDialogOpen] = useState(false);

  useEffect(() => {
    setHintDialogOpen(false);
  }, [activeIdx]);

  const submitAnswer = useSubmitQuizAnswer(activeAttemptId);
  const submitAttempt = useSubmitQuizAttempt(activeAttemptId);

  const autoSubmitStartedRef = useRef(false);
  const questionSeenAtRef = useRef<Record<string, number>>({});

  const displayQuestions: QuizQuestionPublic[] = useMemo(
    () => (taking ? [...taking.questions].sort((a, b) => a.position - b.position) : []),
    [taking],
  );

  const sessionReady =
    taking !== null &&
    statuses.length === displayQuestions.length &&
    displayQuestions.length > 0;

  useEffect(() => {
    const activeQuestionId = displayQuestions[activeIdx]?.id;
    if (!activeQuestionId || questionSeenAtRef.current[activeQuestionId]) return;
    questionSeenAtRef.current[activeQuestionId] = Date.now();
  }, [activeIdx, displayQuestions]);

  useEffect(() => {
    if (!quiz?.time_limit_seconds || !sessionReady || submittedSummary) return;
    const timerId = window.setInterval(() => {
      setTimeLeft((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [quiz?.time_limit_seconds, sessionReady, submittedSummary]);

  async function handleStartAttempt() {
    try {
      const result = await startAttempt.mutateAsync(undefined);
      setTaking(result);
      setStatuses(
        result.questions.map(() => ({
          selectedOptionId: null,
          answerText: null,
          flagged: false,
          hintViewed: false,
          savedToServer: false,
        })),
      );
      setActiveIdx(0);
      setTimeLeft(result.quiz.time_limit_seconds ?? 0);
      autoSubmitStartedRef.current = false;
      questionSeenAtRef.current = {};
      setPerQuestionCooldown({});
    } catch (err) {
      // Server-side retake policy (FR-4.3): 409 = attempts exhausted,
      // 429 = quiz/card cooldown still active (retry time in the body).
      if (extractDetailString(err, "reason") === "max_attempts_reached") {
        toast.error(t("course_quiz.errors.max_attempts_reached"));
      } else if (err instanceof ApiError && err.status === 429) {
        const retryAt = extractRetryAt(err);
        toast.error(
          retryAt
            ? t("course_quiz.errors.quiz_cooldown_active_at", {
                time: new Date(retryAt).toLocaleString(),
              })
            : t("course_quiz.errors.quiz_cooldown_active"),
        );
      } else {
        toast.error(t("course_quiz.errors.start_failed"));
      }
    }
  }

  useEffect(() => {
    if (!taking || activeAttemptId) return;
    const inProgress = attempts.find((a) => a.status === "in_progress");
    if (inProgress) setActiveAttemptId(inProgress.id);
  }, [taking, attempts, activeAttemptId]);

  async function persistAnswer(questionIdx: number): Promise<boolean> {
    const question = displayQuestions[questionIdx];
    const status = statuses[questionIdx];
    if (!question || !status || !activeAttemptId) return false;
    if (!hasAnswer(status)) return false;
    if (status.savedToServer) return true;
    const startedAt = questionSeenAtRef.current[question.id];
    const tActualMs = startedAt ? Math.max(Date.now() - startedAt, 0) : null;

    try {
      await submitAnswer.mutateAsync({
        question_id: question.id,
        selected_option_id: status.selectedOptionId,
        answer_text: status.answerText,
        hint_used: status.hintViewed,
        t_actual_ms: tActualMs,
      });
      setStatuses((current) =>
        current.map((s, i) => (i === questionIdx ? { ...s, savedToServer: true } : s)),
      );
      setPerQuestionCooldown((prev) => {
        if (!prev[question.id]) return prev;
        const next = { ...prev };
        delete next[question.id];
        return next;
      });
      return true;
    } catch (err) {
      if (isApiErrorCode(err, "card_cooldown_active")) {
        const retryAt = extractRetryAt(err);
        if (retryAt) {
          setPerQuestionCooldown((prev) => ({ ...prev, [question.id]: retryAt }));
        }
        toast.error(t("course_quiz.errors.cooldown_active"));
        return false;
      }
      if (err instanceof ApiError && err.status === 429) {
        toast.error(t("course_quiz.errors.rate_limited"));
        return false;
      }
      toast.error((err as Error).message || t("course_quiz.errors.save_answer_failed"));
      return false;
    }
  }

  async function handleSaveNext() {
    const ok = await persistAnswer(activeIdx);
    if (ok) {
      setActiveIdx((current) => Math.min(displayQuestions.length - 1, current + 1));
    }
  }

  async function handleFinalSubmit(trigger: "manual" | "timeout") {
    if (!sessionReady || !activeAttemptId) return;
    if (submitAttempt.isPending) return;

    for (let i = 0; i < displayQuestions.length; i += 1) {
      const status = statuses[i];
      if (!status || !hasAnswer(status)) continue;
      if (status.savedToServer) continue;
      const ok = await persistAnswer(i);
      if (!ok) return;
    }

    try {
      const result = await submitAttempt.mutateAsync();
      setSubmittedSummary(result);
      if (trigger === "timeout") {
        toast.error(t("course_quiz.errors.auto_submitted_timeout"));
      }
    } catch (err) {
      toast.error((err as Error).message || t("course_quiz.errors.submit_failed"));
    }
  }

  useEffect(() => {
    if (
      !quiz?.time_limit_seconds ||
      !sessionReady ||
      timeLeft > 0 ||
      submittedSummary ||
      submitAttempt.isPending
    ) {
      return;
    }
    if (autoSubmitStartedRef.current) return;
    autoSubmitStartedRef.current = true;
    void handleFinalSubmit("timeout");
  }, [
    handleFinalSubmit,
    quiz?.time_limit_seconds,
    sessionReady,
    submittedSummary,
    submitAttempt.isPending,
    timeLeft,
  ]);

  if (courseLoading || quizLoading || attemptsLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="space-y-3 w-full max-w-sm">
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse" />
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse w-4/5" />
          <div className="h-32 rounded-xl bg-m3-surface-container animate-pulse mt-6" />
        </div>
      </div>
    );
  }

  if (!course || !quiz) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-8">
        <GlassCard className="p-10 text-center max-w-md">
          <BookOpen className="h-10 w-10 text-m3-outline mx-auto mb-4" />
          <h2 className="font-headline font-bold text-xl text-m3-on-surface mb-2">
            {t("course_quiz.empty_states.no_quiz_found")}
          </h2>
          <p className="text-sm text-m3-on-surface-variant mb-6">
            {t("course_quiz.empty_states.quiz_not_loadable")}
          </p>
          <Link to="/courses/$slug/learn" params={{ slug }}>
            <Button className="gradient-primary text-white rounded-xl font-bold gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("course_quiz.actions.back_to_course")}
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  if (submittedSummary) {
    const score = Number(submittedSummary.score_percent ?? 0);
    const passed = Boolean(submittedSummary.passed);
    const passingScore = Math.round(Number(quiz.passing_score_percent));

    return (
      <div className="min-h-[70vh] max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <div className="max-w-3xl w-full mx-auto space-y-6">
          <GlassCard className="p-8 sm:p-10 text-center">
            <div
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black font-headline shadow-lg",
                passed
                  ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                  : "bg-gradient-to-br from-m3-primary to-m3-secondary text-white",
              )}
            >
              {Math.round(score)}%
            </div>
            <h2 className="font-headline font-extrabold text-2xl text-m3-primary mb-1">
              {passed
                ? t("course_quiz.results.passed")
                : t("course_quiz.results.submitted")}
            </h2>
            <p className="text-m3-on-surface-variant text-sm mb-2">
              {passed
                ? t("course_quiz.results.passed_summary", {
                    title: quiz.title,
                    score: Math.round(score),
                  })
                : t("course_quiz.results.failed_summary", {
                    score: Math.round(score),
                    passing: passingScore,
                  })}
            </p>
            <p className="text-xs text-m3-outline mb-6">
              {t("course_quiz.labels.attempt_summary", {
                attempt: submittedSummary.attempt_number,
                correct: submittedSummary.correct_count ?? 0,
                total: submittedSummary.total_questions ?? displayQuestions.length,
              })}
            </p>

            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/courses/$slug/learn" params={{ slug }}>
                <Button variant="outline" className="rounded-xl ghost-border font-bold text-sm gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {t("course_quiz.actions.back_to_course")}
                </Button>
              </Link>
            </div>
          </GlassCard>

          <QuizStudyModeCard
            allowRetakes={quiz.allow_retakes}
            maxAttempts={quiz.max_attempts}
            showHints={quiz.show_hints}
            cooldownHours={quiz.cooldown_hours}
          />
        </div>
      </div>
    );
  }

  if (!taking) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <QuizIntroPanel
          quiz={quiz}
          attempts={attempts}
          onStart={() => void handleStartAttempt()}
          starting={startAttempt.isPending}
          slug={slug}
        />
      </div>
    );
  }

  const activeQuestion = displayQuestions[activeIdx];
  const activeStatus = statuses[activeIdx] ?? {
    selectedOptionId: null,
    answerText: null,
    flagged: false,
    hintViewed: false,
    savedToServer: false,
  };
  const completedCount = statuses.filter(hasAnswer).length;
  const flaggedCount = statuses.filter((s) => s.flagged).length;
  const progressPct = displayQuestions.length
    ? Math.round((completedCount / displayQuestions.length) * 100)
    : 0;
  const isLastQuestion = activeIdx === displayQuestions.length - 1;
  const isTimeLow = Boolean(quiz.time_limit_seconds) && timeLeft < 120;
  const passingScore = Math.round(Number(quiz.passing_score_percent));
  const activeQuestionCooldown = activeQuestion
    ? perQuestionCooldown[activeQuestion.id] ?? null
    : null;

  return (
    <div className="min-h-[70vh] pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap -ml-3">
            <Link to="/courses/$slug/learn" params={{ slug }}>
              <Button variant="ghost" size="sm" className="rounded-xl text-m3-on-surface-variant hover:text-m3-primary gap-1.5 text-xs font-bold px-3">
                <ArrowLeft className="h-4 w-4" />
                {t("course_interview.actions.course")}
              </Button>
            </Link>
            <span className="text-m3-on-surface-variant text-sm font-medium hidden sm:block">
              {course.title}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            {quiz.time_limit_seconds ? (
              <div
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm",
                  isTimeLow ? "bg-red-50 text-red-600 animate-pulse" : "bg-m3-surface-container text-m3-primary",
                )}
              >
                <Timer className="h-4 w-4" />
                {formatTime(sessionReady ? timeLeft : quiz.time_limit_seconds)}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-m3-surface-container text-m3-primary font-bold text-sm">
                <Clock className="h-4 w-4" />
                {t("course_quiz.labels.no_time_limit")}
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-end mb-3 gap-4 flex-wrap">
            <div>
              <h1 className="font-headline font-extrabold text-3xl sm:text-4xl text-m3-primary tracking-tight leading-none mb-1">
                {quiz.title}
              </h1>
              <p className="text-m3-on-surface-variant text-base">
                {t("course_quiz.sections.module_review")}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="block font-headline font-bold text-2xl text-m3-secondary">
                {String(activeIdx + 1).padStart(2, "0")}{" "}
                <span className="text-m3-outline-variant font-medium text-sm">
                  / {displayQuestions.length}
                </span>
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-m3-outline">
                {t("course_quiz.labels.attempts_before", { count: attempts.length })}
              </span>
            </div>
          </div>
          <GradientProgress value={progressPct} variant="secondary" size="sm" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8">
            <div className="bg-m3-surface-container-lowest rounded-xl p-6 sm:p-10 relative overflow-hidden shadow-editorial">
              <div className="absolute top-0 right-0 m-5">
                <Badge className="bg-m3-secondary-fixed text-m3-on-surface border-0 font-bold text-[10px] px-3 py-1.5 gap-1.5 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  {t("course_quiz.status.currently_doing")}
                </Badge>
              </div>

              <div className="mb-8 pt-2">
                <span className="text-m3-secondary font-headline font-bold text-xs tracking-widest uppercase mb-3 block">
                  {t("course_quiz.labels.question_label_short", {
                    index: String(activeIdx + 1).padStart(2, "0"),
                  })}
                </span>
                <h2 className="text-xl sm:text-2xl font-headline font-bold text-m3-on-surface leading-snug">
                  {activeQuestion.prompt_text}
                </h2>
              </div>

              <QuestionRenderer
                question={activeQuestion}
                selectedOptionId={activeStatus.selectedOptionId}
                answerText={activeStatus.answerText}
                disabled={submitAnswer.isPending || submitAttempt.isPending}
                onSelectOption={(optionId) => {
                  setStatuses((current) =>
                    current.map((status, index) =>
                      index === activeIdx
                        ? {
                            ...status,
                            selectedOptionId: optionId,
                            savedToServer: false,
                          }
                        : status,
                    ),
                  );
                }}
                onAnswerTextChange={(value) => {
                  setStatuses((current) =>
                    current.map((status, index) =>
                      index === activeIdx
                        ? {
                            ...status,
                            answerText: value,
                            savedToServer: false,
                          }
                        : status,
                    ),
                  );
                }}
              />
            </div>

            <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
              <Button
                variant="ghost"
                onClick={() => setActiveIdx((current) => Math.max(0, current - 1))}
                disabled={activeIdx === 0 || submitAnswer.isPending || submitAttempt.isPending}
                className="font-bold text-m3-primary hover:bg-m3-primary-fixed/30 rounded-xl gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("course_quiz.actions.previous")}
              </Button>

              <div className="flex items-center gap-3 flex-wrap justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStatuses((current) =>
                      current.map((status, index) =>
                        index === activeIdx ? { ...status, flagged: !status.flagged } : status,
                      ),
                    );
                  }}
                  disabled={submitAnswer.isPending || submitAttempt.isPending}
                  className={cn(
                    "font-bold rounded-xl gap-2 text-sm",
                    activeStatus.flagged
                      ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                      : "text-m3-outline hover:text-m3-on-surface",
                  )}
                >
                  <Flag className="h-4 w-4" />
                  {activeStatus.flagged
                    ? t("course_quiz.actions.unflag")
                    : t("course_quiz.actions.flag")}
                </Button>

                <QuestionSubmitButton
                  isLastQuestion={isLastQuestion}
                  isSavedAnswer={activeStatus.savedToServer}
                  hasSelection={hasAnswer(activeStatus)}
                  isSavingAnswer={submitAnswer.isPending}
                  isFinalSubmitting={submitAttempt.isPending}
                  cooldownRetryAt={activeQuestionCooldown}
                  onSaveNext={() => void handleSaveNext()}
                  onFinalSubmit={() => void handleFinalSubmit("manual")}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-5">
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white shadow-ai-glow">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-headline font-bold text-m3-primary text-sm">
                    {t("course_quiz.sections.instructions")}
                  </h4>
                  <p className="text-[10px] text-m3-outline uppercase font-bold tracking-wider">
                    {t("course_quiz.labels.student")}
                  </p>
                </div>
              </div>

              {quiz.show_hints && activeQuestion.hint_text ? (
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 rounded-xl ghost-border font-semibold"
                  onClick={() => {
                    setStatuses((current) =>
                      current.map((status, index) =>
                        index === activeIdx ? { ...status, hintViewed: true } : status,
                      ),
                    );
                    setHintDialogOpen(true);
                  }}
                >
                  <Lightbulb className="h-4 w-4" />
                  {activeStatus.hintViewed
                    ? t("course_quiz.actions.view_hint_again")
                    : t("course_quiz.actions.show_hint")}
                </Button>
              ) : (
                <p className="text-sm text-m3-on-surface-variant leading-relaxed">
                  {t("course_quiz.instructions.choose_best")}
                </p>
              )}
            </GlassCard>

            <HintDialog
              open={hintDialogOpen}
              onOpenChange={setHintDialogOpen}
              hintText={activeQuestion.hint_text ?? ""}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-elev rounded-xl p-4 shadow-sm">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  {t("course_quiz.labels.answered")}
                </span>
                <span className="text-xl font-black font-headline text-m3-primary">
                  {completedCount}
                  <span className="text-sm text-m3-outline-variant font-medium">
                    /{displayQuestions.length}
                  </span>
                </span>
              </div>
              <div className="bg-surface-elev rounded-xl p-4 shadow-sm">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  {t("course_quiz.labels.flagged")}
                </span>
                <span className="text-xl font-black font-headline text-amber-500">{flaggedCount}</span>
              </div>
              <div className="bg-surface-elev rounded-xl p-4 shadow-sm col-span-2">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  {t("course_quiz.labels.passing_score")}
                </span>
                <span className="text-xl font-black font-headline text-m3-secondary">
                  {passingScore}%
                </span>
              </div>
            </div>

            <QuizStudyModeCard
              allowRetakes={quiz.allow_retakes}
              maxAttempts={quiz.max_attempts}
              showHints={quiz.show_hints}
              cooldownHours={quiz.cooldown_hours}
            />
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-m3-outline-variant/15">
          <h4 className="text-xs font-bold text-m3-outline uppercase tracking-widest mb-5 text-center">
            {t("course_quiz.sections.question_overview")}
          </h4>
          <div className="flex flex-wrap justify-center gap-2.5">
            {displayQuestions.map((question, index) => {
              const status = statuses[index] ?? {
                selectedOptionId: null,
                answerText: null,
                flagged: false,
                hintViewed: false,
                savedToServer: false,
              };
              const state = questionState(index, activeIdx, status);
              const onCooldown = !!perQuestionCooldown[question.id];
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setActiveIdx(index)}
                  className={cn(
                    "w-10 h-10 rounded-xl font-bold text-sm transition-all duration-150 hover:scale-110 relative cursor-pointer",
                    state === "completed" && "bg-m3-primary text-white shadow-md",
                    state === "active" && "bg-surface-elev text-m3-primary ring-2 ring-m3-primary shadow-md",
                    state === "flagged" && "bg-amber-100 text-amber-700 ring-2 ring-amber-400",
                    state === "pending" && "bg-m3-surface-container-high text-m3-outline hover:bg-m3-surface-container-highest",
                  )}
                >
                  {index + 1}
                  {onCooldown && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-m3-surface" />
                  )}
                  {state === "flagged" && !onCooldown && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-m3-surface" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
