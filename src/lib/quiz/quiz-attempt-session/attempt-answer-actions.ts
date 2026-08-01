import type { TFunction } from "i18next";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { isApiErrorCode } from "@/lib/api/error-codes";
import { extractRetryAt } from "@/lib/quiz/quiz-session-helpers";
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
}) {
  const { t, state, questionId, err } = args;
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
  toast.error(
    (err as Error).message || t("course_quiz.errors.save_answer_failed"),
  );
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
