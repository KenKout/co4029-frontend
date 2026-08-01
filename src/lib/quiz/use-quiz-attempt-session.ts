import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useMyQuizAttempts,
  useQuizAttemptProgress,
  useStartQuizAttempt,
  useStudentQuiz,
  useSubmitQuizAnswer,
  useSubmitQuizAttempt,
} from "@/lib/api/hooks/quizzes";
import type { QuizQuestionPublic } from "@/lib/api/types";
import { useQuestionFocusTime } from "@/lib/quiz/use-question-focus-time";
import { useQuizIntegrityReporter } from "@/lib/hooks/useQuizIntegrityReporter";
import { useAttemptActions } from "@/lib/quiz/quiz-attempt-session/use-attempt-actions";
import { useAttemptHydration } from "@/lib/quiz/quiz-attempt-session/use-attempt-hydration";
import { useAttemptPagination } from "@/lib/quiz/quiz-attempt-session/use-attempt-pagination";
import { useAttemptSessionState } from "@/lib/quiz/quiz-attempt-session/use-attempt-session-state";
import { useAttemptTimers } from "@/lib/quiz/quiz-attempt-session/use-attempt-timers";
import { usePasswordGate } from "@/lib/quiz/quiz-attempt-session/use-password-gate";

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
  const attemptProgress = useQuizAttemptProgress(
    resumeRequested ? (inProgressAttempt?.id ?? null) : null,
  );

  const state = useAttemptSessionState();
  const { taking, activeAttemptId, activeIdx, submittedSummary } = state;

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

  // Proctoring: report tab-switch / focus-loss signals ONLY while a take is
  // live (an attempt exists and we're in taking mode). Passing null outside
  // an active take detaches the listeners. Fire-and-forget; never blocks UI.
  useQuizIntegrityReporter(taking && activeAttemptId ? activeAttemptId : null);

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
        ? [...taking.questions].sort((a, b) => a.position - b.position)
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
  });

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
    requestResume: () => setResumeRequested(true),
    resumeRequested,
    resuming,
  };
}
