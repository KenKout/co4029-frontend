import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { Input } from "@/components/ui/input";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { useCourseBySlug } from "@/lib/api/hooks/courses";
import {
  QuizSummaryCard,
  type QuizSummaryItem,
} from "@/routes/_components/QuizSummaryCard";
import { QuizConfigPopover } from "@/routes/_components/QuizConfigPopover";
import { QuizIntegrityNotice } from "@/routes/_components/QuizIntegrityNotice";
import { QuizQuestionCard } from "@/routes/_components/QuizQuestionCard";
import { QuizHintDialog } from "@/routes/_components/QuizHintDialog";
import { QuizIntroPanel } from "@/routes/_components/QuizIntroPanel";
import { QuizResultScreen } from "@/routes/_components/QuizResultScreen";
import { QuizSubmitButton } from "@/routes/_components/QuizSubmitButton";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { cn } from "@/lib/utils";
import { QUIZ_PAGE_SIZES } from "@/lib/quiz-timing";
import {
  EMPTY_STATUS,
  formatDuration,
  formatTime,
  hasAnswer,
  questionState,
} from "@/lib/quiz/quiz-session-helpers";
import { useQuizAttemptSession } from "@/lib/quiz/use-quiz-attempt-session";

/**
 * Student quiz-taking route. All attempt state + lifecycle lives in
 * {@link useQuizAttemptSession}; the sub-views (intro, results, hint dialog,
 * submit controls) live in `_components/Quiz*`. This file is the shell that
 * wires the session to those views and owns only the taking-mode layout.
 */
export default function CourseQuizPage() {
  const { t } = useTranslation();
  const { slug, quizId } = useParams({ strict: false }) as {
    slug: string;
    quizId: string;
  };

  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const session = useQuizAttemptSession(quizId);
  const {
    quiz,
    quizLoading,
    attempts,
    attemptsLoading,
    inProgressAttempt,
    taking,
    activeAttemptId,
    activeIdx,
    setActiveIdx,
    statuses,
    setStatuses,
    submittedSummary,
    perQuestionCooldown,
    hintDialogOpen,
    setHintDialogOpen,
    quizStartedAt,
    quizElapsed,
    timeLeft,
    sessionReady,
    displayQuestions,
    focusTime,
    pageSize,
    changePageSize,
    goToPage,
    pageCount,
    safePageIndex,
    pageStart,
    pageEnd,
    pageQuestions,
    passwordDialogOpen,
    setPasswordDialogOpen,
    passwordInput,
    setPasswordInput,
    passwordError,
    setPasswordError,
    submitPassword,
    startAttempt,
    submitAnswer,
    submitAttempt,
    handleStartAttempt,
    handleSaveOnly,
    handleSaveNext,
    handleFinalSubmit,
    requestResume,
    resumeRequested,
    resuming,
  } = session;

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
    return (
      <QuizResultScreen
        quiz={quiz}
        summary={submittedSummary}
        totalQuestionsFallback={displayQuestions.length}
        slug={slug}
      />
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
          onResume={requestResume}
          starting={startAttempt.isPending}
          resuming={resumeRequested}
          slug={slug}
          courseTitle={course?.title}
        />

        {/* Access-password prompt — shown when the quiz requires a password
            (server returns 403 quiz_password_required on start). */}
        <PromptDialog
          open={passwordDialogOpen}
          onOpenChange={(open) => {
            setPasswordDialogOpen(open);
            if (!open) {
              setPasswordInput("");
              setPasswordError(null);
            }
          }}
          title={t("course_quiz.password.title")}
          description={t("course_quiz.password.description")}
          confirmLabel={
            startAttempt.isPending
              ? t("course_quiz.password.submitting")
              : t("course_quiz.password.submit")
          }
          cancelLabel={t("common.cancel", "Cancel")}
          onConfirm={submitPassword}
          isPending={startAttempt.isPending}
        >
          <div className="space-y-1.5">
            <Input
              type="password"
              autoFocus
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitPassword();
                }
              }}
              placeholder={t("course_quiz.password.placeholder")}
              aria-label={t("course_quiz.password.title")}
              aria-invalid={passwordError ? true : undefined}
            />
            {passwordError && (
              <p className="text-xs font-medium text-m3-error">
                {passwordError}
              </p>
            )}
          </div>
        </PromptDialog>
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
  const activeStatus = statuses[activeIdx] ?? EMPTY_STATUS;
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
      const status = statuses[index] ?? EMPTY_STATUS;
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
          <div className="lg:col-span-8 xl:col-span-9">
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
                <QuizSubmitButton
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

          <div className="lg:col-span-4 xl:col-span-3 space-y-5 lg:sticky lg:top-32 lg:self-start">
            <QuizHintDialog
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
