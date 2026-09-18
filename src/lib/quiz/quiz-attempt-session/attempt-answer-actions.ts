import type { TFunction } from "i18next";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { getApiErrorMessage, isApiErrorCode } from "@/lib/api/error-codes";
import {
  extractDetailString,
  extractRetryAt,
} from "@/lib/quiz/quiz-session-helpers";
import type { AttemptSessionState } from "./use-attempt-session-state";

/**
 * Failure reporting for a per-question answer save, lifted verbatim out of
 * `persistAnswer`. Every branch ended in `return false`, so the caller owns the
 * return and this only reports.
 */
export function reportPersistFailure(args: {
  t: TFunction;
  state: AttemptSessionState;
  questionId: string;
  err: unknown;
  onSessionConflict?: (reason: string) => void;
}) {
  const { t, state, questionId, err, onSessionConflict } = args;
  if (isApiErrorCode(err, "card_cooldown_active")) {
    const retryAt = extractRetryAt(err);
    if (retryAt) {
      state.setPerQuestionCooldown((prev) => ({
        ...prev,
        [questionId]: retryAt,
      }));
    }
    toast.error(t("course_quiz.errors.cooldown_active"));
    return;
  }
  if (err instanceof ApiError && err.status === 429) {
    toast.error(t("course_quiz.errors.rate_limited"));
    return;
  }
  const conflictReason =
    err instanceof ApiError
      ? err.code ?? extractDetailString(err, "reason")
      : null;
  if (
    err instanceof ApiError &&
    err.status === 409 &&
    (conflictReason === "quiz_session_replaced" ||
      conflictReason === "attempt_not_in_progress")
  ) {
    onSessionConflict?.(conflictReason);
    return;
  }
  toast.error(getApiErrorMessage(err, t("course_quiz.errors.save_answer_failed")));
}

/** Mark a question as saved and drop any cooldown we were showing for it. */
export function markAnswerSaved(
  state: AttemptSessionState,
  questionIdx: number,
  questionId: string,
) {
  state.setStatuses((current) =>
    current.map((s, i) =>
      i === questionIdx ? { ...s, savedToServer: true } : s,
    ),
  );
  state.setPerQuestionCooldown((prev) => {
    if (!prev[questionId]) return prev;
    const next = { ...prev };
    delete next[questionId];
    return next;
  });
}
