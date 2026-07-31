import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Flag,
  ListChecks,
  RotateCcw,
  Target,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { QuizAttemptRead, QuizPublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/quiz/quiz-session-helpers";

/**
 * The pre-attempt landing view: quiz overview (stats, scheduling window,
 * already-passed banner), the start/resume/blocked CTA, and the attempt
 * history list. Rendered before a take begins.
 */
export function QuizIntroPanel({
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
