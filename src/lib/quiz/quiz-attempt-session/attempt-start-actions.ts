import type { TFunction } from "i18next";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import type { QuizAttemptProgressRead } from "@/lib/api/hooks/quizzes";
import { clearSeenAt } from "@/lib/quiz-timing";
import {
  extractDetailString,
  extractRetryAt,
} from "@/lib/quiz/quiz-session-helpers";
import type { AttemptSessionRefs, QuestionFocusTime } from "./types";
import type { AttemptSessionState } from "./use-attempt-session-state";
import type { PasswordGate } from "./use-password-gate";

/**
 * Start / resume actions for a quiz attempt, lifted verbatim out of
 * `useQuizAttemptSession`. They were plain closures over the hook body; the
 * enclosing scope is now passed explicitly as `ctx`.
 */
export interface AttemptActionsContext {
  t: TFunction;
  state: AttemptSessionState;
  passwordGate: PasswordGate;
  focusTime: QuestionFocusTime;
  refs: AttemptSessionRefs;
}

/** Commit a freshly started (or restarted) attempt to local session state. */
export function applyStartedAttempt(
  ctx: AttemptActionsContext,
  result: QuizAttemptProgressRead,
) {
  const { state, passwordGate, focusTime, refs } = ctx;
  // Success — clear any password prompt state.
  passwordGate.setPasswordDialogOpen(false);
  passwordGate.setPasswordInput("");
  passwordGate.setPasswordError(null);
  refs.hydratedAttemptIdRef.current = result.attempt_id;
  state.setTaking(result.take);
  state.setActiveAttemptId(result.attempt_id);
  state.setStatuses(
    result.take.questions.map(() => ({
      selectedOptionId: null,
      answerText: null,
      flagged: false,
      hintViewed: false,
      savedToServer: false,
    })),
  );
  state.setActiveIdx(0);
  state.setTimeLeft(result.take.quiz.time_limit_seconds ?? 0);
  state.setQuizStartedAt(Date.now());
  state.setQuizElapsed(0);
  refs.autoSubmitStartedRef.current = false;
  // Fresh attempt: drop any stale persisted timing for this id.
  clearSeenAt(result.attempt_id);
  refs.questionSeenAtRef.current = {};
  focusTime.reset();
  state.setPageIndex(0);
  state.setPerQuestionCooldown({});
}

/** The 429 cooldown toast, with the retry time when the body carried one. */
function reportCooldown(t: TFunction, err: unknown) {
  const retryAt = extractRetryAt(err);
  toast.error(
    retryAt
      ? t("course_quiz.errors.quiz_cooldown_active_at", {
          time: new Date(retryAt).toLocaleString(),
        })
      : t("course_quiz.errors.quiz_cooldown_active"),
  );
}

/**
 * Server-side retake policy (FR-4.3): 409 = attempts exhausted,
 * 429 = quiz/card cooldown still active (retry time in the body).
 */
export function reportStartFailure(ctx: AttemptActionsContext, err: unknown) {
  const { t, passwordGate } = ctx;
  const reason = extractDetailString(err, "reason");
  if (reason === "quiz_password_required") {
    // Quiz is password-protected — prompt for it (first attempt to start).
    passwordGate.setPasswordError(null);
    passwordGate.setPasswordDialogOpen(true);
  } else if (reason === "quiz_password_incorrect") {
    // Wrong password — keep the dialog open with an inline error.
    passwordGate.setPasswordError(t("course_quiz.password.incorrect"));
    passwordGate.setPasswordDialogOpen(true);
  } else if (reason === "quiz_subnet_blocked") {
    toast.error(t("course_quiz.errors.quiz_subnet_blocked"));
  } else if (reason === "max_attempts_reached") {
    toast.error(t("course_quiz.errors.max_attempts_reached"));
  } else if (err instanceof ApiError && err.status === 429) {
    reportCooldown(t, err);
  } else {
    toast.error(t("course_quiz.errors.start_failed"));
  }
}
