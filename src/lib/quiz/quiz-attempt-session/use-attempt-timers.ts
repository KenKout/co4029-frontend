import { useEffect } from "react";
import { saveFocusMs } from "@/lib/quiz-timing";
import type { QuestionFocusTime, StudentQuiz } from "./types";
import type { AttemptSessionState } from "./use-attempt-session-state";

/**
 * The three interval timers a live attempt runs, in their original declaration
 * order: the focus-time mirror, the countdown, then the total-elapsed ticker.
 */
export function useAttemptTimers(args: {
  state: AttemptSessionState;
  quiz: StudentQuiz;
  focusTime: QuestionFocusTime;
  sessionReady: boolean;
}) {
  const { state, quiz, focusTime, sessionReady } = args;
  const { activeAttemptId, submittedSummary, quizStartedAt } = state;

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
      state.setTimeLeft((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [quiz?.time_limit_seconds, sessionReady, submittedSummary]);

  // Total-elapsed ticker. Runs for EVERY live attempt regardless of whether
  // the quiz has a time limit, so the elapsed indicator is always visible.
  // Derives from the wall-clock start so it stays accurate across refreshes.
  useEffect(() => {
    if (quizStartedAt == null || !sessionReady || submittedSummary) return;
    const tick = () =>
      state.setQuizElapsed(
        Math.max(0, Math.floor((Date.now() - quizStartedAt) / 1000)),
      );
    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [quizStartedAt, sessionReady, submittedSummary]);
}
