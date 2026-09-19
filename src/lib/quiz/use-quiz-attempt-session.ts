import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useMyQuizAttempts,
  useQuizAttemptProgress,
  useStartQuizAttempt,
  useStudentQuiz,
  useSubmitQuizAnswer,
  useSubmitQuizAttempt,
  useClaimQuizAttemptSession,
  useTakeoverQuizAttemptSession,
} from "@/lib/api/hooks/quizzes";
import { ApiError } from "@/lib/api/client";
import type { QuizQuestionPublic } from "@/lib/api/types";
import { useQuestionFocusTime } from "@/lib/quiz/use-question-focus-time";
import { useQuizIntegrityReporter } from "@/lib/hooks/useQuizIntegrityReporter";
import { useAssessmentFullscreenGate } from "@/lib/hooks/useAssessmentFullscreenGate";
import { useAttemptActions } from "@/lib/quiz/quiz-attempt-session/use-attempt-actions";
import { useAttemptHydration } from "@/lib/quiz/quiz-attempt-session/use-attempt-hydration";
import { useAttemptPagination } from "@/lib/quiz/quiz-attempt-session/use-attempt-pagination";
import { useAttemptSessionState } from "@/lib/quiz/quiz-attempt-session/use-attempt-session-state";
import { useAttemptTimers } from "@/lib/quiz/quiz-attempt-session/use-attempt-timers";
import { usePasswordGate } from "@/lib/quiz/quiz-attempt-session/use-password-gate";
import { useQuizCamera } from "@/lib/quiz/use-quiz-camera";
import { useQuizAttemptTabGuard } from "@/lib/quiz/use-quiz-attempt-tab-guard";

/** Use the server's canonical quiz id once the quiz payload has loaded.
 * Legacy `/learn/$itemSlug` routes may initially pass a human-readable slug;
 * using it as a browser lock can collide with the same slug in another course.
 */
export function resolveQuizAttemptTabGuardId(
  routeQuizId: string,
  canonicalQuizId: string | null | undefined,
): string {
  return canonicalQuizId ?? routeQuizId;
}

/**
 * Owns the entire quiz-taking attempt lifecycle for a given quiz: server data
 * (quiz / attempts / progress), local answer state, per-question focus timing,
 * pagination, the countdown/elapsed timers, and the start / resume / save /
 * submit actions. Extracted from course-quiz.tsx so that route file is purely
 * a presentational shell over this state machine.
 *
 * The returned object is deliberately flat and named to mirror what the page
 * previously held inline, so the render code reads the same.
 *
 * The pieces live in `./quiz-attempt-session/`. They are called in the SAME
 * relative order the inline hooks had — hook order (and therefore effect
 * ordering on commit) is part of this hook's behaviour, not an implementation
 * detail.
 */
// This hook is the single state-machine owner for the live quiz workspace.
// eslint-disable-next-line max-lines-per-function, complexity
export function useQuizAttemptSession(quizId: string) {
  const { t } = useTranslation();

  const { data: quiz, isLoading: quizLoading } = useStudentQuiz(quizId);
  const { data: attempts = [], isLoading: attemptsLoading } =
    useMyQuizAttempts(quizId);

  const startAttempt = useStartQuizAttempt(quizId);

  const passwordGate = usePasswordGate();

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
  const [sessionConflict, setSessionConflict] = useState<string | null>(null);
  const [conflictAttemptId, setConflictAttemptId] = useState<string | null>(
    null,
  );
  const resumableAttemptId = inProgressAttempt?.id ?? conflictAttemptId;
  const attemptProgress = useQuizAttemptProgress(
    resumeRequested ? resumableAttemptId : null,
  );

  // A failed resume must return the CTA to an actionable state. Otherwise the
  // dialog keeps receiving `resumeRequested=true` forever after a 409/404 or a
  // transient network failure, which looks like an infinite loading spinner.
  useEffect(() => {
    if (resumeRequested && attemptProgress.isError) {
      setResumeRequested(false);
    }
  }, [attemptProgress.isError, resumeRequested]);

  const state = useAttemptSessionState();
  const { taking, activeAttemptId, activeIdx, submittedSummary } = state;
  const camera = useQuizCamera(
    Boolean(quiz?.require_camera),
    submittedSummary == null,
  );
  const guardedAttemptId = submittedSummary
    ? null
    : (activeAttemptId ?? inProgressAttempt?.id ?? conflictAttemptId);
  const tabGuardQuizId = resolveQuizAttemptTabGuardId(quizId, quiz?.id);
  const tabGuard = useQuizAttemptTabGuard(tabGuardQuizId, guardedAttemptId);
  const claimSession = useClaimQuizAttemptSession(resumableAttemptId);
  const takeoverSession = useTakeoverQuizAttemptSession(resumableAttemptId);
  const handleSessionConflict = useCallback(
    (reason: string, attemptId?: string) => {
      setSessionConflict(reason);
      setConflictAttemptId(attemptId ?? null);
    },
    [],
  );

  // --- Per-question attention timing ---------------------------------------
  // Replaces the old "elapsed since first seen" measure, which only held when
  // exactly one question was on screen. See use-question-focus-time.ts.
  const focusTime = useQuestionFocusTime({
    paused: submittedSummary != null,
  });

  useEffect(() => {
    state.setHintDialogOpen(false);
  }, [activeIdx]);

  const submitAnswer = useSubmitQuizAnswer(activeAttemptId);
  const submitAttempt = useSubmitQuizAttempt(activeAttemptId);

  // Proctoring: report tab-switch / focus-loss / connection signals ONLY while
  // a take is live (an attempt exists and we're in taking mode). Passing null
  // outside an active take detaches the listeners. Fire-and-forget; never
  // blocks UI.
  const writesEnabled =
    tabGuard.isOwner && !tabGuard.blocked && !tabGuard.surrendered;
  const integrity = useQuizIntegrityReporter(
    writesEnabled && taking && activeAttemptId ? activeAttemptId : null,
  );

  // Fullscreen is MANDATORY for every quiz attempt, matching the interview.
  //
  // It used to hang off a per-quiz `browser_security` setting, which meant two
  // independent ways for a proctoring signal to silently never exist: a quiz
  // left at the default 'none' never entered fullscreen, and even when it was
  // switched on the student could decline the prompt and carry on windowed.
  // Either way the teacher's timeline showed no fullscreen exits — not because
  // nothing happened, but because nothing could. A gate an author can switch
  // off is not a gate, so the setting was retired outright (migration 0114),
  // the same way the interview has never had one.
  const fullscreen = useAssessmentFullscreenGate(
    Boolean(taking && activeAttemptId),
    {
      // Only UNEXPECTED exits reach this callback — the underlying browser-API
      // hook suppresses the programmatic exit performed when the attempt ends,
      // so submitting never charges a student one exit.
      onUnexpectedExit: () =>
        integrity.record({
          event_type: "fullscreen_exit",
          severity: "warning",
        }),
    },
  );

  const autoSubmitStartedRef = useRef(false);
  const questionSeenAtRef = useRef<Record<string, number>>({});
  const hydratedAttemptIdRef = useRef<string | null>(null);
  const refs = {
    autoSubmitStartedRef,
    questionSeenAtRef,
    hydratedAttemptIdRef,
  };

  useAttemptHydration({ attemptProgress, state, focusTime, refs });

  const displayQuestions: QuizQuestionPublic[] = useMemo(
    () =>
      taking
        ? ([...taking.questions] as QuizQuestionPublic[]).sort(
            (a, b) => a.position - b.position,
          )
        : [],
    [taking],
  );

  const sessionReady =
    taking !== null &&
    state.statuses.length === displayQuestions.length &&
    displayQuestions.length > 0;

  const pagination = useAttemptPagination({
    state,
    displayQuestions,
    sessionReady,
  });

  useAttemptTimers({ state, quiz, focusTime, sessionReady });

  const actions = useAttemptActions({
    t,
    state,
    passwordGate,
    focusTime,
    refs,
    quiz,
    displayQuestions,
    sessionReady,
    startAttempt,
    submitAnswer,
    submitAttempt,
    enterFullscreen: fullscreen.enter,
    ensureCamera: camera.ensureActive,
    stopCamera: camera.stop,
    requireCamera: Boolean(quiz?.require_camera),
    onSessionConflict: handleSessionConflict,
    writesEnabled,
  });

  const requestResume = useCallback(async () => {
    if (!resumableAttemptId) return;
    if (camera.required && !(await camera.ensureActive())) return;
    void fullscreen.enter();
    try {
      await claimSession.mutateAsync();
      setSessionConflict(null);
      setResumeRequested(true);
    } catch (error) {
      setResumeRequested(false);
      if (
        error instanceof ApiError &&
        (error.status === 409 || error.status === 503)
      ) {
        setSessionConflict(
          error.status === 503
            ? "quiz_session_guard_unavailable"
            : (error.code ?? "attempt_active_elsewhere"),
        );
      }
    }
  }, [camera, claimSession, fullscreen, resumableAttemptId]);

  const takeoverAndResume = useCallback(async () => {
    if (!resumableAttemptId) return;
    if (camera.required && !(await camera.ensureActive())) return;
    void fullscreen.enter();
    try {
      await takeoverSession.mutateAsync();
      setSessionConflict(null);
      setResumeRequested(true);
    } catch (error) {
      setResumeRequested(false);
      if (error instanceof ApiError && error.status === 503) {
        setSessionConflict("quiz_session_guard_unavailable");
      }
    }
  }, [camera, fullscreen, resumableAttemptId, takeoverSession]);

  const continueInThisTab = useCallback(async () => {
    try {
      const transferred = await tabGuard.requestTransfer();
      if (!transferred) {
        toast.error(t("course_quiz.tab_guard.transfer_failed"));
        return;
      }
      if (!resumableAttemptId) return;
      await requestResume();
    } catch (error) {
      setResumeRequested(false);
      if (error instanceof ApiError && error.status === 503) {
        setSessionConflict("quiz_session_guard_unavailable");
      } else {
        toast.error(t("course_quiz.tab_guard.transfer_failed"));
      }
    }
  }, [requestResume, resumableAttemptId, t, tabGuard]);

  const handleExit = useCallback(async () => {
    await actions.handleSaveOnly();
    try {
      await tabGuard.releaseServerOwnership();
    } catch {
      // The server TTL is the fallback if Redis is unavailable during exit.
    }
    camera.stop();
    await fullscreen.exit();
    state.setTaking(null);
    state.setActiveAttemptId(null);
    state.setStatuses([]);
    state.setSubmittedSummary(null);
    setResumeRequested(false);
    setSessionConflict(null);
    setConflictAttemptId(null);
  }, [actions.handleSaveOnly, camera, fullscreen, state, tabGuard]);

  // Once the user clicks Resume, hold on the skeleton while the resume payload
  // loads instead of flashing the intro panel before hydrating.
  const resuming =
    resumeRequested &&
    !!resumableAttemptId &&
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
    setActiveIdx: state.setActiveIdx,
    statuses: state.statuses,
    setStatuses: state.setStatuses,
    submittedSummary,
    perQuestionCooldown: state.perQuestionCooldown,
    hintDialogOpen: state.hintDialogOpen,
    setHintDialogOpen: state.setHintDialogOpen,
    quizStartedAt: state.quizStartedAt,
    quizElapsed: state.quizElapsed,
    timeLeft: state.timeLeft,
    sessionReady,
    displayQuestions,
    focusTime,
    // pagination
    pageSize: state.pageSize,
    changePageSize: pagination.changePageSize,
    goToPage: pagination.goToPage,
    perPage: pagination.perPage,
    pageCount: pagination.pageCount,
    safePageIndex: pagination.safePageIndex,
    pageStart: pagination.pageStart,
    pageEnd: pagination.pageEnd,
    pageQuestions: pagination.pageQuestions,
    // password gate
    passwordDialogOpen: passwordGate.passwordDialogOpen,
    setPasswordDialogOpen: passwordGate.setPasswordDialogOpen,
    passwordInput: passwordGate.passwordInput,
    setPasswordInput: passwordGate.setPasswordInput,
    passwordError: passwordGate.passwordError,
    setPasswordError: passwordGate.setPasswordError,
    submitPassword: actions.submitPassword,
    // mutations (for pending flags)
    startAttempt,
    submitAnswer,
    submitAttempt,
    // actions
    handleStartAttempt: actions.handleStartAttempt,
    handleSaveOnly: actions.handleSaveOnly,
    handleSaveNext: actions.handleSaveNext,
    handleFinalSubmit: actions.handleFinalSubmit,
    requestResume,
    takeoverAndResume,
    continueInThisTab,
    handleExit,
    resumeRequested,
    resuming,
    // mandatory fullscreen gate — live for every attempt
    fullscreen,
    camera,
    tabGuard,
    sessionConflict,
    writesEnabled,
  };
}
