import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Flag,
  Lightbulb,
  ListChecks,
  RotateCcw,
  Target,
  Timer,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardCooldownBadge } from "@/components/ui/card-cooldown-badge";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { ApiError } from "@/lib/api/client";
import { useCourseBySlug } from "@/lib/api/hooks/courses";
import {
  useMyQuizAttempts,
  useQuizAttemptProgress,
  useStartQuizAttempt,
  useStudentQuiz,
  useSubmitQuizAnswer,
  useSubmitQuizAttempt,
} from "@/lib/api/hooks/quizzes";
import { useCardCooldown } from "@/lib/api/cooldown";
import { isApiErrorCode } from "@/lib/api/error-codes";
import {
  QuizSummaryCard,
  type QuizSummaryItem,
} from "@/routes/_components/QuizSummaryCard";
import { QuizConfigPopover } from "@/routes/_components/QuizConfigPopover";
import { QuizIntegrityNotice } from "@/routes/_components/QuizIntegrityNotice";
import type {
  QuizAttemptRead,
  QuizForTakingPublic,
  QuizPublic,
  QuizQuestionPublic,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  clearSeenAt,
  loadSeenAt,
  loadFocusMs,
  loadPageSize,
  savePageSize,
  saveFocusMs,
  QUIZ_PAGE_SIZES,
  type QuizPageSize,
} from "@/lib/quiz-timing";
import { useQuestionFocusTime } from "@/lib/quiz/use-question-focus-time";
import { QuizQuestionCard } from "@/routes/_components/QuizQuestionCard";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { useQuizIntegrityReporter } from "@/lib/hooks/useQuizIntegrityReporter";

type QuestionState = "completed" | "active" | "flagged" | "pending";

interface QuestionStatus {
  selectedOptionId: string | null;
  answerText: string | null;
  flagged: boolean;
  hintViewed: boolean;
  savedToServer: boolean;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Elapsed time can run for hours on an untimed quiz, so it needs an
// hour segment that ``formatTime`` (mm:ss only) can't express. Falls back
// to mm:ss under an hour to stay visually consistent with the countdown.
function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function hasAnswer(status: QuestionStatus): boolean {
  return (
    status.selectedOptionId !== null || (status.answerText ?? "").length > 0
  );
}

function questionState(
  idx: number,
  activeIdx: number,
  status: QuestionStatus,
): QuestionState {
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
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("course_quiz.actions.close_hint", "Close")}
                />
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
                ? t("course_quiz.values.retake_max_attempts", {
                    count: maxAttempts,
                  })
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
  inProgressAttempt,
  onStart,
  onResume,
  starting,
  resuming,
  slug,
  courseTitle,
}: {
  quiz: QuizPublic;
  attempts: QuizAttemptRead[];
  inProgressAttempt: QuizAttemptRead | null;
  onStart: () => void;
  onResume: () => void;
  starting: boolean;
  resuming: boolean;
  slug: string;
  courseTitle?: string | null;
}) {
  const { t } = useTranslation();
  const completed = attempts.filter(
    (a) => a.status === "submitted" || a.status === "graded",
  ).length;
  const passingScore = Math.round(Number(quiz.passing_score_percent));

  // Best score across graded/submitted attempts + whether the student has
  // already cleared the passing bar — powers the "you've passed" banner and
  // the best-score chip. null when no scored attempt exists yet.
  const scoredAttempts = attempts.filter(
    (a) => a.status === "submitted" || a.status === "graded",
  );
  const bestScore = scoredAttempts.reduce<number | null>((best, a) => {
    if (a.score_percent == null) return best;
    const s = Number(a.score_percent);
    return best == null || s > best ? s : best;
  }, null);
  const hasPassed = scoredAttempts.some((a) => a.passed === true);
  const questionCount = quiz.question_count ?? 0;
  const maxAttemptsReached =
    quiz.max_attempts != null && completed >= quiz.max_attempts;
  const noRetakesLeft = completed > 0 && !quiz.allow_retakes;

  // Scheduling window (backend migration 0032). NULL columns = no bound.
  // available_from → not open yet; available_until → closed. `due_at` is a
  // soft deadline: never blocks, only surfaces a "due" label / late warning.
  const now = Date.now();
  const openAt = quiz.available_from ? new Date(quiz.available_from) : null;
  const closeAt = quiz.available_until ? new Date(quiz.available_until) : null;
  const dueAt = quiz.due_at ? new Date(quiz.due_at) : null;
  const notYetOpen = openAt != null && now < openAt.getTime();
  const windowClosed = closeAt != null && now > closeAt.getTime();
  const pastDue = dueAt != null && now > dueAt.getTime();
  const blocked =
    maxAttemptsReached || noRetakesLeft || notYetOpen || windowClosed;

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
          {/* Module-context eyebrow — frames the bare title (which course /
              that this is a quiz), matching the interview-lobby pattern. */}
          <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-m3-secondary">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{t("course_quiz.overview.eyebrow")}</span>
            {courseTitle && (
              <>
                <span className="text-m3-outline">·</span>
                <span className="max-w-[220px] truncate font-semibold normal-case text-m3-on-surface-variant">
                  {courseTitle}
                </span>
              </>
            )}
          </div>
          <h1 className="font-headline font-extrabold text-3xl text-m3-primary mb-3">
            {quiz.title}
          </h1>
          {quiz.description && (
            <p className="text-m3-on-surface-variant mb-6">
              {quiz.description}
            </p>
          )}

          {/* Already-passed banner — flips the page tone from "take it" to
              "you're done, retake optional" when the student has cleared it. */}
          {hasPassed && (
            <div className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{t("course_quiz.overview.passed_banner_title")}</span>
              {bestScore != null && (
                <span className="text-emerald-700">
                  ·{" "}
                  {t("course_quiz.overview.passed_banner_best", {
                    score: bestScore.toFixed(0),
                  })}
                </span>
              )}
            </div>
          )}

          {/* Stat tiles — icon chip + label + value, one consistent value
              colour (the old design used three different colours for no
              reason) and a hairline border for contrast. */}
          <div className="mb-8 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
            <div className="flex items-center gap-3 rounded-xl bg-m3-surface-container ghost-border p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
                <Target className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
                  {t("course_quiz.labels.passing_score")}
                </span>
                <span className="font-headline text-base font-black text-m3-on-surface">
                  {passingScore}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-m3-surface-container ghost-border p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
                <ListChecks className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
                  {t("course_quiz.overview.questions")}
                </span>
                <span className="font-headline text-base font-black text-m3-on-surface">
                  {questionCount > 0 ? questionCount : "—"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-m3-surface-container ghost-border p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
                <Clock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
                  {t("course_quiz.labels.time")}
                </span>
                <span className="font-headline text-base font-black text-m3-on-surface">
                  {quiz.time_limit_seconds
                    ? formatTime(quiz.time_limit_seconds)
                    : t("course_quiz.values.no_limit")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-m3-surface-container ghost-border p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
                  {t("course_quiz.labels.attempts")}
                </span>
                <span className="font-headline text-base font-black text-m3-on-surface">
                  {completed}
                  {quiz.max_attempts != null && (
                    <span className="text-sm font-medium text-m3-outline-variant">
                      /{quiz.max_attempts}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {(openAt || closeAt || dueAt) && (
            <div className="mb-8 flex flex-col gap-2 text-left">
              {openAt && (
                <div className="flex items-center gap-2 text-sm text-m3-on-surface-variant">
                  <Clock className="h-4 w-4 shrink-0 text-m3-primary" />
                  <span>
                    {t(
                      notYetOpen
                        ? "course_quiz.schedule.opens_at"
                        : "course_quiz.schedule.opened_at",
                      { when: openAt.toLocaleString() },
                    )}
                  </span>
                </div>
              )}
              {closeAt && (
                <div className="flex items-center gap-2 text-sm text-m3-on-surface-variant">
                  <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    {t(
                      windowClosed
                        ? "course_quiz.schedule.closed_at"
                        : "course_quiz.schedule.closes_at",
                      { when: closeAt.toLocaleString() },
                    )}
                  </span>
                </div>
              )}
              {dueAt && (
                <div
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    pastDue
                      ? "text-amber-700 font-medium"
                      : "text-m3-on-surface-variant",
                  )}
                >
                  <Flag className="h-4 w-4 shrink-0" />
                  <span>
                    {t(
                      pastDue
                        ? "course_quiz.schedule.was_due"
                        : "course_quiz.schedule.due_by",
                      { when: dueAt.toLocaleString() },
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {inProgressAttempt ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-m3-primary-fixed/30 border border-m3-primary/20 px-4 py-3 text-sm text-m3-on-surface flex items-center justify-center gap-2">
                <RotateCcw className="h-4 w-4 text-m3-primary shrink-0" />
                <span>
                  {t("course_quiz.resume.pending_notice", {
                    number: inProgressAttempt.attempt_number,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-3 justify-center flex-wrap">
                <Button
                  onClick={onResume}
                  disabled={resuming || starting}
                  className="gradient-primary text-white rounded-xl font-bold gap-2 px-8 py-3 h-auto"
                >
                  {resuming
                    ? t("course_quiz.resume.resuming")
                    : t("course_quiz.resume.resume")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : blocked ? (
            <div className="rounded-xl bg-m3-surface-container-low px-4 py-3 text-sm text-m3-on-surface-variant">
              {notYetOpen &&
                t("course_quiz.messages.not_yet_open", {
                  when: openAt ? openAt.toLocaleString() : "",
                })}
              {windowClosed &&
                t("course_quiz.messages.window_closed", {
                  when: closeAt ? closeAt.toLocaleString() : "",
                })}
              {noRetakesLeft &&
                !notYetOpen &&
                !windowClosed &&
                t("course_quiz.messages.no_retakes")}
              {maxAttemptsReached &&
                !notYetOpen &&
                !windowClosed &&
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

        {(reviewableAttempts.length > 0 || inProgressAttempt) && (
          <GlassCard className="p-6 sm:p-8">
            <h2 className="font-headline font-bold text-base text-m3-on-surface mb-4">
              {t("course_quiz.history.title")}
            </h2>
            <div className="space-y-2">
              {inProgressAttempt && (
                <button
                  type="button"
                  onClick={onResume}
                  disabled={resuming || starting}
                  className="w-full flex items-center gap-4 p-3 rounded-xl bg-m3-primary-fixed/20 hover:bg-m3-primary-fixed/40 transition-colors group text-left disabled:opacity-60"
                >
                  <span className="text-xs font-headline font-black text-m3-primary tabular-nums shrink-0 w-8">
                    #{inProgressAttempt.attempt_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-m3-primary/10 text-m3-primary">
                        {t("course_quiz.status.currently_doing")}
                      </span>
                    </div>
                    <p className="text-xs text-m3-on-surface-variant mt-0.5">
                      {new Date(inProgressAttempt.started_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-m3-primary group-hover:underline shrink-0 flex items-center gap-1">
                    <RotateCcw className="h-3.5 w-3.5" />
                    {resuming
                      ? t("course_quiz.resume.resuming")
                      : t("course_quiz.resume.resume")}
                  </span>
                </button>
              )}
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
                              "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                              passed
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700",
                            )}
                          >
                            {passed ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
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
  hasSelection,
  isSaved,
  isSavingAnswer,
  isFinalSubmitting,
  cooldownRetryAt: cooldownAt,
  onSave,
  onSaveNext,
  onFinalSubmit,
}: {
  isLastQuestion: boolean;
  hasSelection: boolean;
  isSaved: boolean;
  isSavingAnswer: boolean;
  isFinalSubmitting: boolean;
  cooldownRetryAt: string | null;
  onSave: () => void;
  onSaveNext: () => void;
  onFinalSubmit: () => void;
}) {
  const { t } = useTranslation();
  const cooldown = useCardCooldown(cooldownAt);
  const cooldownActive = !!cooldownAt && !cooldown.isExpired;
  const busy = isSavingAnswer || isFinalSubmitting;
  const primaryDisabled = !hasSelection || busy || cooldownActive;
  // Save (secondary) is additionally suppressed once the current answer is
  // already persisted — there's nothing new to write. Continue/Submit stay
  // enabled so the student can still advance without a redundant save.
  const saveDisabled = primaryDisabled || isSaved;

  // Secondary "Save" — persists the current answer in place, no navigation.
  const saveButton = (
    <Button
      variant="outline"
      onClick={onSave}
      disabled={saveDisabled}
      className="font-bold rounded-xl gap-2 px-5 py-3 h-auto border-m3-primary/40 text-m3-primary hover:bg-m3-primary-fixed/30 active:scale-95 transition-all disabled:opacity-50"
    >
      {isSavingAnswer
        ? t("course_quiz.actions.saving")
        : isSaved
          ? t("course_quiz.actions.saved")
          : t("course_quiz.actions.save")}
    </Button>
  );

  return (
    <div className="flex items-center gap-3 flex-wrap justify-end">
      {cooldownActive && <CardCooldownBadge retryAt={cooldownAt} />}
      {saveButton}
      {isLastQuestion ? (
        <Button
          onClick={onFinalSubmit}
          disabled={primaryDisabled}
          className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow px-6 py-3 h-auto hover:opacity-90 active:scale-95 transition-all"
        >
          {isFinalSubmitting
            ? t("course_quiz.actions.submitting")
            : isSavingAnswer
              ? t("course_quiz.actions.saving")
              : t("course_quiz.actions.submit")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={onSaveNext}
          disabled={primaryDisabled}
          className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow px-6 py-3 h-auto hover:opacity-90 active:scale-95 transition-all"
        >
          {isSavingAnswer
            ? t("course_quiz.actions.saving")
            : t("course_quiz.actions.continue")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default function CourseQuizPage() {
  const { t } = useTranslation();
  const { slug, quizId } = useParams({ strict: false }) as {
    slug: string;
    quizId: string;
  };

  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const { data: quiz, isLoading: quizLoading } = useStudentQuiz(quizId);
  const { data: attempts = [], isLoading: attemptsLoading } =
    useMyQuizAttempts(quizId);

  const startAttempt = useStartQuizAttempt(quizId);

  // A prior in-progress attempt (from before a refresh / back-navigation) —
  // when present, its saved answers are rehydrated instead of starting fresh.
  const inProgressAttempt = useMemo(
    () => attempts.find((a) => a.status === "in_progress") ?? null,
    [attempts],
  );
  // Resume is now an explicit user action (Resume button on the intro
  // panel), NOT an automatic drop-in on mount. Auto-resuming raced the
  // attempts list and (a) hid the intro/history and (b) fell through to
  // POSTing a fresh attempt on the loser of the race — which is exactly
  // how this quiz accumulated 13 empty in_progress duplicates.
  const [resumeRequested, setResumeRequested] = useState(false);
  const attemptProgress = useQuizAttemptProgress(
    resumeRequested ? (inProgressAttempt?.id ?? null) : null,
  );

  const [taking, setTaking] = useState<QuizForTakingPublic | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [statuses, setStatuses] = useState<QuestionStatus[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submittedSummary, setSubmittedSummary] =
    useState<QuizAttemptRead | null>(null);
  const [perQuestionCooldown, setPerQuestionCooldown] = useState<
    Record<string, string>
  >({});
  const [hintDialogOpen, setHintDialogOpen] = useState(false);
  // Wall-clock start of the whole attempt (epoch ms). Drives the "Started at"
  // label and the total-elapsed indicator, which stays visible whether or not
  // the quiz has a time limit. Set on fresh start and on resume/hydrate so the
  // elapsed count reflects the ORIGINAL start, not this session.
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [quizElapsed, setQuizElapsed] = useState(0);

  // --- Pagination -----------------------------------------------------------
  // How many questions render at once: 1 (classic one-per-screen), 5, 10, or
  // every question on a single page. Persisted per device.
  const [pageSize, setPageSize] = useState<QuizPageSize>(() => loadPageSize());
  const [pageIndex, setPageIndex] = useState(0);

  // --- Per-question attention timing ---------------------------------------
  // Replaces the old "elapsed since first seen" measure, which only held when
  // exactly one question was on screen. See use-question-focus-time.ts.
  const focusTime = useQuestionFocusTime({
    paused: submittedSummary != null,
  });

  useEffect(() => {
    setHintDialogOpen(false);
  }, [activeIdx]);

  const submitAnswer = useSubmitQuizAnswer(activeAttemptId);
  const submitAttempt = useSubmitQuizAttempt(activeAttemptId);

  // Proctoring: report tab-switch / focus-loss signals ONLY while a take is
  // live (an attempt exists and we're in taking mode). Passing null outside
  // an active take detaches the listeners. Fire-and-forget; never blocks UI.
  useQuizIntegrityReporter(taking && activeAttemptId ? activeAttemptId : null);

  const autoSubmitStartedRef = useRef(false);
  const questionSeenAtRef = useRef<Record<string, number>>({});
  const hydratedAttemptIdRef = useRef<string | null>(null);

  // Rehydrate local state from the server once, per attempt — runs on
  // mount/refresh/back-navigation when an in_progress attempt already
  // exists, so answers already saved via /answers aren't shown as blank.
  useEffect(() => {
    if (!attemptProgress.data || taking) return;
    if (hydratedAttemptIdRef.current === attemptProgress.data.attempt_id)
      return;
    hydratedAttemptIdRef.current = attemptProgress.data.attempt_id;

    const progress = attemptProgress.data;
    const sortedQuestions = [...progress.take.questions].sort(
      (a, b) => a.position - b.position,
    );
    const answersByQuestion = new Map(
      progress.answers.map((a) => [a.question_id, a]),
    );

    setTaking(progress.take);
    setActiveAttemptId(progress.attempt_id);
    setStatuses(
      sortedQuestions.map((q) => {
        const saved = answersByQuestion.get(q.id);
        return {
          selectedOptionId: saved?.selected_option_id ?? null,
          answerText: saved?.answer_text ?? null,
          flagged: false,
          hintViewed: saved?.hint_used ?? false,
          savedToServer: saved != null,
        };
      }),
    );
    const firstUnanswered = sortedQuestions.findIndex(
      (q) => !answersByQuestion.get(q.id),
    );
    setActiveIdx(firstUnanswered === -1 ? 0 : firstUnanswered);

    const startedAtMs = new Date(progress.started_at).getTime();
    setQuizStartedAt(startedAtMs);
    setQuizElapsed(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
    const timeLimit = progress.take.quiz.time_limit_seconds ?? 0;
    if (timeLimit) {
      const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
      setTimeLeft(Math.max(0, timeLimit - elapsedSeconds));
    }
    autoSubmitStartedRef.current = false;
    // Restore per-question first-seen timestamps so the elapsed badge (and
    // the t_actual_ms we report) keep counting from the ORIGINAL first view,
    // not from this refresh/resume. Falls back to {} when nothing persisted.
    questionSeenAtRef.current = loadSeenAt(progress.attempt_id);
    // Restore banked attention time so a refresh doesn't reset every badge
    // (and every reported t_actual_ms) to zero.
    focusTime.reset(loadFocusMs(progress.attempt_id));
    setPerQuestionCooldown({});
  }, [attemptProgress.data, taking]);

  const displayQuestions: QuizQuestionPublic[] = useMemo(
    () =>
      taking
        ? [...taking.questions].sort((a, b) => a.position - b.position)
        : [],
    [taking],
  );

  const sessionReady =
    taking !== null &&
    statuses.length === displayQuestions.length &&
    displayQuestions.length > 0;

  // --- Page slicing ---------------------------------------------------------
  const perPage =
    pageSize === "all" ? Math.max(1, displayQuestions.length) : pageSize;
  const pageCount = Math.max(1, Math.ceil(displayQuestions.length / perPage));
  // Clamp so shrinking the quiz (or switching 1 -> All) can't strand us on a
  // page that no longer exists.
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageStart = safePageIndex * perPage;
  const pageEnd = Math.min(pageStart + perPage, displayQuestions.length);
  const pageQuestions = displayQuestions.slice(pageStart, pageEnd);

  // Keep the page in step with the active question. Jumping via the summary
  // card sets activeIdx; if that question lives on another page we follow it.
  useEffect(() => {
    if (!sessionReady) return;
    const target = Math.floor(activeIdx / perPage);
    setPageIndex((current) => (current === target ? current : target));
  }, [activeIdx, perPage, sessionReady]);

  const changePageSize = useCallback(
    (next: QuizPageSize) => {
      setPageSize(next);
      savePageSize(next);
      // Keep the student anchored on the question they were looking at rather
      // than snapping to page 1.
      const nextPer =
        next === "all" ? Math.max(1, displayQuestions.length) : next;
      setPageIndex(Math.floor(activeIdx / nextPer));
    },
    [activeIdx, displayQuestions.length],
  );

  const goToPage = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, pageCount - 1));
      setPageIndex(clamped);
      // Move the active question to the first on the new page so per-question
      // actions and the "current" highlight stay meaningful.
      setActiveIdx(clamped * perPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [pageCount, perPage],
  );

  // Mirror accumulated focus totals to localStorage so a refresh mid-attempt
  // resumes with the time already banked rather than restarting at zero.
  useEffect(() => {
    if (!activeAttemptId || !sessionReady || submittedSummary) return;
    const id = window.setInterval(() => {
      saveFocusMs(activeAttemptId, focusTime.snapshot());
    }, 5000);
    return () => {
      window.clearInterval(id);
      saveFocusMs(activeAttemptId, focusTime.snapshot());
    };
  }, [activeAttemptId, sessionReady, submittedSummary, focusTime]);

  useEffect(() => {
    if (!quiz?.time_limit_seconds || !sessionReady || submittedSummary) return;
    const timerId = window.setInterval(() => {
      setTimeLeft((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [quiz?.time_limit_seconds, sessionReady, submittedSummary]);

  // Total-elapsed ticker. Runs for EVERY live attempt regardless of whether
  // the quiz has a time limit, so the elapsed indicator is always visible.
  // Derives from the wall-clock start so it stays accurate across refreshes.
  useEffect(() => {
    if (quizStartedAt == null || !sessionReady || submittedSummary) return;
    const tick = () =>
      setQuizElapsed(
        Math.max(0, Math.floor((Date.now() - quizStartedAt) / 1000)),
      );
    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [quizStartedAt, sessionReady, submittedSummary]);

  async function handleStartAttempt() {
    try {
      const result = await startAttempt.mutateAsync(undefined);
      hydratedAttemptIdRef.current = result.attempt_id;
      setTaking(result.take);
      setActiveAttemptId(result.attempt_id);
      setStatuses(
        result.take.questions.map(() => ({
          selectedOptionId: null,
          answerText: null,
          flagged: false,
          hintViewed: false,
          savedToServer: false,
        })),
      );
      setActiveIdx(0);
      setTimeLeft(result.take.quiz.time_limit_seconds ?? 0);
      setQuizStartedAt(Date.now());
      setQuizElapsed(0);
      autoSubmitStartedRef.current = false;
      // Fresh attempt: drop any stale persisted timing for this id.
      clearSeenAt(result.attempt_id);
      questionSeenAtRef.current = {};
      focusTime.reset();
      setPageIndex(0);
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

  async function persistAnswer(questionIdx: number): Promise<boolean> {
    const question = displayQuestions[questionIdx];
    const status = statuses[questionIdx];
    if (!question || !status || !activeAttemptId) return false;
    if (!hasAnswer(status)) return false;
    if (status.savedToServer) return true;
    // Accumulated ATTENTION time (see use-question-focus-time.ts). `null` when
    // the question was never observed, which the backend treats as a neutral
    // rho=1.0 rather than recording an implausible instant answer.
    //
    // NOT capped here: the cap needs `expected_response_time_ms`, which the
    // student payload deliberately omits (telling students how long a question
    // "should" take would leak teacher intent). The backend clamps instead —
    // see `_clamp_t_actual` in spaced_repetition/services/review.py.
    const tActualMs = focusTime.getFocusMs(question.id);

    try {
      await submitAnswer.mutateAsync({
        question_id: question.id,
        selected_option_id: status.selectedOptionId,
        answer_text: status.answerText,
        hint_used: status.hintViewed,
        t_actual_ms: tActualMs,
      });
      setStatuses((current) =>
        current.map((s, i) =>
          i === questionIdx ? { ...s, savedToServer: true } : s,
        ),
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
          setPerQuestionCooldown((prev) => ({
            ...prev,
            [question.id]: retryAt,
          }));
        }
        toast.error(t("course_quiz.errors.cooldown_active"));
        return false;
      }
      if (err instanceof ApiError && err.status === 429) {
        toast.error(t("course_quiz.errors.rate_limited"));
        return false;
      }
      toast.error(
        (err as Error).message || t("course_quiz.errors.save_answer_failed"),
      );
      return false;
    }
  }

  // Save the current answer WITHOUT navigating. Distinct from Continue so a
  // student can checkpoint their answer and keep thinking on the same
  // question. `persistAnswer` is idempotent (returns true and no-ops when the
  // answer is already saved), so a redundant Save is harmless.
  async function handleSaveOnly() {
    await persistAnswer(activeIdx);
  }

  async function handleSaveNext() {
    const ok = await persistAnswer(activeIdx);
    if (ok) {
      setActiveIdx((current) =>
        Math.min(displayQuestions.length - 1, current + 1),
      );
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
      // Attempt is finalized — drop the persisted per-question timing mirror.
      if (activeAttemptId) clearSeenAt(activeAttemptId);
      setSubmittedSummary(result);
      if (trigger === "timeout") {
        toast.error(t("course_quiz.errors.auto_submitted_timeout"));
      }
    } catch (err) {
      toast.error(
        (err as Error).message || t("course_quiz.errors.submit_failed"),
      );
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

  // Once the user clicks Resume, hold on the skeleton while the resume
  // payload loads instead of flashing the intro panel before hydrating.
  const resuming =
    resumeRequested &&
    !!inProgressAttempt &&
    attemptProgress.isLoading &&
    !taking;

  if (courseLoading || quizLoading || attemptsLoading || resuming) {
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
      <div className="min-h-[70vh] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
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
                total:
                  submittedSummary.total_questions ?? displayQuestions.length,
              })}
            </p>

            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/courses/$slug/learn" params={{ slug }}>
                <Button
                  variant="outline"
                  className="rounded-xl ghost-border font-bold text-sm gap-2"
                >
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
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <QuizIntroPanel
          quiz={quiz}
          attempts={attempts}
          inProgressAttempt={inProgressAttempt}
          onStart={() => void handleStartAttempt()}
          onResume={() => setResumeRequested(true)}
          starting={startAttempt.isPending}
          resuming={resumeRequested}
          slug={slug}
          courseTitle={course?.title}
        />
      </div>
    );
  }

  // Defensive: a live take can legitimately carry zero questions — e.g. a
  // quiz published before the approval gate whose questions are all still
  // pending review (the approved-only taking filter excludes them). Render a
  // friendly empty state instead of dereferencing an undefined question.
  if (displayQuestions.length === 0) {
    return (
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-10">
        <div className="max-w-lg mx-auto text-center bg-m3-surface-container-lowest rounded-xl p-10 shadow-editorial space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="font-headline font-bold text-xl text-m3-on-surface">
            {t("course_quiz.empty.no_questions_title")}
          </h2>
          <p className="text-sm text-m3-on-surface-variant">
            {t("course_quiz.empty.no_questions_body")}
          </p>
          <Link to="/courses/$slug/learn" params={{ slug }}>
            <Button variant="outline" className="gap-2 mt-2">
              <ArrowLeft className="h-4 w-4" />
              {t("course_interview.actions.course")}
            </Button>
          </Link>
        </div>
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
    ? (perQuestionCooldown[activeQuestion.id] ?? null)
    : null;

  const summaryItems: QuizSummaryItem[] = displayQuestions.map(
    (question, index) => {
      const status = statuses[index] ?? {
        selectedOptionId: null,
        answerText: null,
        flagged: false,
        hintViewed: false,
        savedToServer: false,
      };
      return {
        id: question.id,
        index,
        state: questionState(index, activeIdx, status),
        onCooldown: !!perQuestionCooldown[question.id],
        promptText: question.prompt_text,
      };
    },
  );

  return (
    <div className="min-h-[70vh] pb-20">
      <div className="sticky top-16 z-10 bg-m3-surface/95 backdrop-blur-md border-b border-m3-outline-variant/30 py-4 mb-6 px-4 sm:px-6 lg:px-10 -mx-4 sm:-mx-6 lg:-mx-10 -mt-6 shadow-sm">
        <div className="w-full flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap -ml-3">
            <Link to="/courses/$slug/learn" params={{ slug }}>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-m3-on-surface-variant hover:text-m3-primary gap-1.5 text-xs font-bold px-3"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("course_interview.actions.course")}
              </Button>
            </Link>
            <span className="text-m3-on-surface-variant text-sm font-medium hidden sm:block">
              {course.title}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <QuizConfigPopover
              allowRetakes={quiz.allow_retakes}
              maxAttempts={quiz.max_attempts}
              showHints={quiz.show_hints}
              cooldownHours={quiz.cooldown_hours}
            />
            {taking && activeAttemptId && <QuizIntegrityNotice />}
            {/* Started-at: when the current attempt began (wall clock). */}
            {quizStartedAt != null && (
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-m3-surface-container text-m3-on-surface-variant text-sm">
                <Clock className="h-4 w-4 text-m3-primary" />
                <span className="font-medium">
                  {t("course_quiz.labels.started_at")}
                </span>
                <span className="font-semibold tabular-nums text-m3-on-surface">
                  {new Date(quizStartedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            {/* Elapsed: always visible, timed or not. */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-m3-surface-container text-m3-on-surface-variant font-mono font-bold text-sm">
              <Timer className="h-4 w-4 text-m3-secondary" />
              <span className="tabular-nums text-m3-on-surface">
                {formatDuration(quizElapsed)}
              </span>
            </div>
            {/* Countdown: only when the quiz has a time limit. */}
            {quiz.time_limit_seconds ? (
              <div
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm",
                  isTimeLow
                    ? "bg-red-50 text-red-600 animate-pulse"
                    : "bg-m3-primary-fixed/40 text-m3-primary",
                )}
              >
                <Timer className="h-4 w-4" />
                {formatTime(sessionReady ? timeLeft : quiz.time_limit_seconds)}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-m3-surface-container text-m3-on-surface-variant text-sm font-medium">
                <Clock className="h-4 w-4" />
                {t("course_quiz.labels.no_time_limit")}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 pt-2">
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
                {t("course_quiz.labels.attempts_before", {
                  count: attempts.length,
                })}
              </span>
            </div>
          </div>
          <GradientProgress value={progressPct} variant="secondary" size="sm" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-9 xl:col-span-10">
            {/* Per-page selector. 1 keeps the classic one-question-per-screen
                flow; 5/10/All render several cards at once. */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("course_quiz.pagination.per_page_label")}
                </span>
                <div
                  role="group"
                  aria-label={t("course_quiz.pagination.per_page_label")}
                  className="flex items-center rounded-lg border border-m3-outline-variant/40 bg-m3-surface-container p-0.5"
                >
                  {QUIZ_PAGE_SIZES.map((size) => (
                    <button
                      key={String(size)}
                      type="button"
                      onClick={() => changePageSize(size)}
                      aria-pressed={pageSize === size}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-bold transition-colors",
                        pageSize === size
                          ? "bg-m3-primary text-white"
                          : "text-m3-on-surface-variant hover:text-m3-primary",
                      )}
                    >
                      {size === "all"
                        ? t("course_quiz.pagination.per_page_all")
                        : size}
                    </button>
                  ))}
                </div>
              </div>
              {pageCount > 1 && (
                <span className="text-xs font-semibold text-m3-on-surface-variant tabular-nums">
                  {t("course_quiz.pagination.showing", {
                    from: pageStart + 1,
                    to: pageEnd,
                    total: displayQuestions.length,
                  })}
                </span>
              )}
            </div>

            {/* Question cards for the current page. */}
            <div className="space-y-6">
              {pageQuestions.map((question, offset) => {
                const index = pageStart + offset;
                const status = statuses[index];
                if (!status) return null;
                return (
                  <QuizQuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    total={displayQuestions.length}
                    status={status}
                    isActive={index === activeIdx}
                    disabled={submitAnswer.isPending || submitAttempt.isPending}
                    showHints={quiz.show_hints}
                    hintText={question.hint_text ?? null}
                    cooldownRetryAt={perQuestionCooldown[question.id] ?? null}
                    registerRef={focusTime.register(question.id)}
                    peekFocusMs={() => focusTime.peekFocusMs(question.id)}
                    onFocusQuestion={() => setActiveIdx(index)}
                    onSelectOption={(optionId) => {
                      setStatuses((current) =>
                        current.map((s, i) =>
                          i === index
                            ? {
                                ...s,
                                selectedOptionId: optionId,
                                savedToServer: false,
                              }
                            : s,
                        ),
                      );
                    }}
                    onAnswerTextChange={(value) => {
                      setStatuses((current) =>
                        current.map((s, i) =>
                          i === index
                            ? { ...s, answerText: value, savedToServer: false }
                            : s,
                        ),
                      );
                    }}
                    onToggleFlag={() => {
                      setStatuses((current) =>
                        current.map((s, i) =>
                          i === index ? { ...s, flagged: !s.flagged } : s,
                        ),
                      );
                    }}
                    onShowHint={() => {
                      setActiveIdx(index);
                      setStatuses((current) =>
                        current.map((s, i) =>
                          i === index ? { ...s, hintViewed: true } : s,
                        ),
                      );
                      setHintDialogOpen(true);
                    }}
                  />
                );
              })}
            </div>

            {/* Page navigation (multi-question layouts only). */}
            {pageCount > 1 && (
              <div className="mt-6 flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  onClick={() => goToPage(safePageIndex - 1)}
                  disabled={
                    safePageIndex === 0 ||
                    submitAnswer.isPending ||
                    submitAttempt.isPending
                  }
                  className="font-bold text-m3-primary hover:bg-m3-primary-fixed/30 rounded-xl gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("course_quiz.pagination.prev_page")}
                </Button>
                <span className="text-xs font-bold text-m3-on-surface-variant tabular-nums">
                  {t("course_quiz.pagination.page_of", {
                    page: safePageIndex + 1,
                    pages: pageCount,
                  })}
                </span>
                <Button
                  variant="ghost"
                  onClick={() => goToPage(safePageIndex + 1)}
                  disabled={
                    safePageIndex >= pageCount - 1 ||
                    submitAnswer.isPending ||
                    submitAttempt.isPending
                  }
                  className="font-bold text-m3-primary hover:bg-m3-primary-fixed/30 rounded-xl gap-2"
                >
                  {t("course_quiz.pagination.next_page")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
              <Button
                variant="ghost"
                onClick={() =>
                  setActiveIdx((current) => Math.max(0, current - 1))
                }
                disabled={
                  activeIdx === 0 ||
                  submitAnswer.isPending ||
                  submitAttempt.isPending
                }
                className="font-bold text-m3-primary hover:bg-m3-primary-fixed/30 rounded-xl gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("course_quiz.actions.previous")}
              </Button>

              <div className="flex items-center gap-3 flex-wrap justify-end">
                <QuestionSubmitButton
                  isLastQuestion={isLastQuestion}
                  hasSelection={hasAnswer(activeStatus)}
                  isSaved={activeStatus.savedToServer}
                  isSavingAnswer={submitAnswer.isPending}
                  isFinalSubmitting={submitAttempt.isPending}
                  cooldownRetryAt={activeQuestionCooldown}
                  onSave={() => void handleSaveOnly()}
                  onSaveNext={() => void handleSaveNext()}
                  onFinalSubmit={() => void handleFinalSubmit("manual")}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 xl:col-span-2 space-y-5 lg:sticky lg:top-32 lg:self-start">
            <HintDialog
              open={hintDialogOpen}
              onOpenChange={setHintDialogOpen}
              hintText={activeQuestion.hint_text ?? ""}
            />

            <QuizSummaryCard
              items={summaryItems}
              answeredCount={completedCount}
              flaggedCount={flaggedCount}
              total={displayQuestions.length}
              passingScore={passingScore}
              onJump={(index) => setActiveIdx(index)}
            />
          </div>
        </div>
      </div>
      {/* Long page in the 5/10/All layouts — the student can be many screens
          below the timer and the submit controls. */}
      <ScrollToTop />
    </div>
  );
}
