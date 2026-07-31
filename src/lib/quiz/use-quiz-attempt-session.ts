import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import {
  useMyQuizAttempts,
  useQuizAttemptProgress,
  useStartQuizAttempt,
  useStudentQuiz,
  useSubmitQuizAnswer,
  useSubmitQuizAttempt,
} from "@/lib/api/hooks/quizzes";
import { isApiErrorCode } from "@/lib/api/error-codes";
import type {
  QuizAttemptRead,
  QuizForTakingPublic,
  QuizQuestionPublic,
} from "@/lib/api/types";
import {
  clearSeenAt,
  loadSeenAt,
  loadFocusMs,
  loadPageSize,
  savePageSize,
  saveFocusMs,
  type QuizPageSize,
} from "@/lib/quiz-timing";
import { useQuestionFocusTime } from "@/lib/quiz/use-question-focus-time";
import { useQuizIntegrityReporter } from "@/lib/hooks/useQuizIntegrityReporter";
import {
  extractDetailString,
  extractRetryAt,
  hasAnswer,
  type QuestionStatus,
} from "@/lib/quiz/quiz-session-helpers";

/**
 * Owns the entire quiz-taking attempt lifecycle for a given quiz: server data
 * (quiz / attempts / progress), local answer state, per-question focus timing,
 * pagination, the countdown/elapsed timers, and the start / resume / save /
 * submit actions. Extracted from course-quiz.tsx so that route file is purely
 * a presentational shell over this state machine.
 *
 * The returned object is deliberately flat and named to mirror what the page
 * previously held inline, so the render code reads the same.
 */
export function useQuizAttemptSession(quizId: string) {
  const { t } = useTranslation();

  const { data: quiz, isLoading: quizLoading } = useStudentQuiz(quizId);
  const { data: attempts = [], isLoading: attemptsLoading } =
    useMyQuizAttempts(quizId);

  const startAttempt = useStartQuizAttempt(quizId);

  // Access-password gate (Phase 12). When the quiz has a password configured,
  // the start-attempt POST returns 403 {reason: quiz_password_required}; we
  // open this dialog, collect the password, and retry the start with it.
  // quiz_password_incorrect re-opens it with an inline error.
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // A prior in-progress attempt (from before a refresh / back-navigation) —
  // when present, its saved answers are rehydrated instead of starting fresh.
  const inProgressAttempt = useMemo(
    () => attempts.find((a) => a.status === "in_progress") ?? null,
    [attempts],
  );
  // Resume is an explicit user action (Resume button), NOT an automatic
  // drop-in on mount. Auto-resuming raced the attempts list and (a) hid the
  // intro/history and (b) fell through to POSTing a fresh attempt on the loser
  // of the race — which is how a quiz accumulated empty in_progress duplicates.
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
  }, [attemptProgress.data, taking, focusTime]);

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

  const handleStartAttempt = useCallback(
    async (password?: string) => {
      try {
        const result = await startAttempt.mutateAsync(
          password ? { password } : undefined,
        );
        // Success — clear any password prompt state.
        setPasswordDialogOpen(false);
        setPasswordInput("");
        setPasswordError(null);
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
        const reason = extractDetailString(err, "reason");
        if (reason === "quiz_password_required") {
          // Quiz is password-protected — prompt for it (first attempt to start).
          setPasswordError(null);
          setPasswordDialogOpen(true);
        } else if (reason === "quiz_password_incorrect") {
          // Wrong password — keep the dialog open with an inline error.
          setPasswordError(t("course_quiz.password.incorrect"));
          setPasswordDialogOpen(true);
        } else if (reason === "quiz_subnet_blocked") {
          toast.error(t("course_quiz.errors.quiz_subnet_blocked"));
        } else if (reason === "max_attempts_reached") {
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
    },
    [startAttempt, focusTime, t],
  );

  const submitPassword = useCallback(() => {
    const pw = passwordInput.trim();
    if (!pw) {
      setPasswordError(t("course_quiz.password.required_error"));
      return;
    }
    void handleStartAttempt(pw);
  }, [passwordInput, handleStartAttempt, t]);

  const persistAnswer = useCallback(
    async (questionIdx: number): Promise<boolean> => {
      const question = displayQuestions[questionIdx];
      const status = statuses[questionIdx];
      if (!question || !status || !activeAttemptId) return false;
      if (!hasAnswer(status)) return false;
      if (status.savedToServer) return true;
      // Accumulated ATTENTION time (see use-question-focus-time.ts). `null`
      // when the question was never observed, which the backend treats as a
      // neutral rho=1.0 rather than recording an implausible instant answer.
      //
      // NOT capped here: the cap needs `expected_response_time_ms`, which the
      // student payload deliberately omits (telling students how long a
      // question "should" take would leak teacher intent). The backend clamps
      // instead — see `_clamp_t_actual` in spaced_repetition/services/review.py.
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
    },
    [displayQuestions, statuses, activeAttemptId, focusTime, submitAnswer, t],
  );

  // Save the current answer WITHOUT navigating. Distinct from Continue so a
  // student can checkpoint their answer and keep thinking on the same question.
  // `persistAnswer` is idempotent (returns true and no-ops when the answer is
  // already saved), so a redundant Save is harmless.
  const handleSaveOnly = useCallback(async () => {
    await persistAnswer(activeIdx);
  }, [persistAnswer, activeIdx]);

  const handleSaveNext = useCallback(async () => {
    const ok = await persistAnswer(activeIdx);
    if (ok) {
      setActiveIdx((current) =>
        Math.min(displayQuestions.length - 1, current + 1),
      );
    }
  }, [persistAnswer, activeIdx, displayQuestions.length]);

  const handleFinalSubmit = useCallback(
    async (trigger: "manual" | "timeout") => {
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
    },
    [
      sessionReady,
      activeAttemptId,
      submitAttempt,
      displayQuestions.length,
      statuses,
      persistAnswer,
      t,
    ],
  );

  // Auto-submit when a timed quiz's clock hits zero.
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

  // Once the user clicks Resume, hold on the skeleton while the resume payload
  // loads instead of flashing the intro panel before hydrating.
  const resuming =
    resumeRequested &&
    !!inProgressAttempt &&
    attemptProgress.isLoading &&
    !taking;

  return {
    // server data
    quiz,
    quizLoading,
    attempts,
    attemptsLoading,
    inProgressAttempt,
    // session state
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
    // pagination
    pageSize,
    changePageSize,
    goToPage,
    perPage,
    pageCount,
    safePageIndex,
    pageStart,
    pageEnd,
    pageQuestions,
    // password gate
    passwordDialogOpen,
    setPasswordDialogOpen,
    passwordInput,
    setPasswordInput,
    passwordError,
    setPasswordError,
    submitPassword,
    // mutations (for pending flags)
    startAttempt,
    submitAnswer,
    submitAttempt,
    // actions
    handleStartAttempt,
    handleSaveOnly,
    handleSaveNext,
    handleFinalSubmit,
    requestResume: () => setResumeRequested(true),
    resumeRequested,
    resuming,
  };
}
