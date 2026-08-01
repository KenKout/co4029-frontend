import { useCallback } from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import type { QuizQuestionPublic } from "@/lib/api/types";
import { clearSeenAt } from "@/lib/quiz-timing";
import { hasAnswer } from "@/lib/quiz/quiz-session-helpers";
import {
  markAnswerSaved,
  reportPersistFailure,
} from "./attempt-answer-actions";
import {
  applyStartedAttempt,
  reportStartFailure,
  type AttemptActionsContext,
} from "./attempt-start-actions";
import type {
  AttemptSessionRefs,
  QuestionFocusTime,
  StartAttemptMutation,
  StudentQuiz,
  SubmitAnswerMutation,
  SubmitAttemptMutation,
} from "./types";
import type { AttemptSessionState } from "./use-attempt-session-state";
import { useAutoSubmitOnTimeout } from "./use-auto-submit-on-timeout";
import type { PasswordGate } from "./use-password-gate";

/**
 * The attempt's write actions — start, per-answer save, final submit — plus the
 * timeout auto-submit effect. All six callbacks keep their original dependency
 * arrays and their original declaration order, since `handleFinalSubmit` is a
 * dependency of the auto-submit effect that must trail them.
 */
export function useAttemptActions(args: {
  t: TFunction;
  state: AttemptSessionState;
  passwordGate: PasswordGate;
  focusTime: QuestionFocusTime;
  refs: AttemptSessionRefs;
  quiz: StudentQuiz;
  displayQuestions: QuizQuestionPublic[];
  sessionReady: boolean;
  startAttempt: StartAttemptMutation;
  submitAnswer: SubmitAnswerMutation;
  submitAttempt: SubmitAttemptMutation;
}) {
  const {
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
  } = args;
  const { activeIdx, activeAttemptId, statuses } = state;
  const { passwordInput } = passwordGate;
  const ctx: AttemptActionsContext = {
    t,
    state,
    passwordGate,
    focusTime,
    refs,
  };

  const handleStartAttempt = useCallback(
    async (password?: string) => {
      try {
        const result = await startAttempt.mutateAsync(
          password ? { password } : undefined,
        );
        applyStartedAttempt(ctx, result);
      } catch (err) {
        reportStartFailure(ctx, err);
      }
    },
    [startAttempt, focusTime, t],
  );

  const submitPassword = useCallback(() => {
    const pw = passwordInput.trim();
    if (!pw) {
      passwordGate.setPasswordError(t("course_quiz.password.required_error"));
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
        markAnswerSaved(state, questionIdx, question.id);
        return true;
      } catch (err) {
        reportPersistFailure({ t, state, questionId: question.id, err });
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
      state.setActiveIdx((current) =>
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
        state.setSubmittedSummary(result);
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
  useAutoSubmitOnTimeout({
    quiz,
    state,
    refs,
    sessionReady,
    submitAttempt,
    handleFinalSubmit,
  });

  return {
    handleStartAttempt,
    submitPassword,
    handleSaveOnly,
    handleSaveNext,
    handleFinalSubmit,
  };
}
