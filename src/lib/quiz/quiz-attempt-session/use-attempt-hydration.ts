import { useEffect } from "react";
import type { QuizAttemptProgressAnswer } from "@/lib/api/hooks/quizzes";
import type { QuizQuestionPublic } from "@/lib/api/types";
import { loadFocusMs, loadSeenAt } from "@/lib/quiz-timing";
import type { QuestionStatus } from "@/lib/quiz/quiz-session-helpers";
import type {
  AttemptProgressQuery,
  AttemptSessionRefs,
  QuestionFocusTime,
} from "./types";
import type { AttemptSessionState } from "./use-attempt-session-state";

/**
 * Rebuild the per-question status list from the answers already persisted for
 * this attempt. Lifted out of the hydration effect unchanged.
 */
function statusesFromProgress(
  sortedQuestions: QuizQuestionPublic[],
  answersByQuestion: Map<string, QuizAttemptProgressAnswer>,
): QuestionStatus[] {
  return sortedQuestions.map((q) => {
    const saved = answersByQuestion.get(q.id);
    return {
      selectedOptionId: saved?.selected_option_id ?? null,
      answerText: saved?.answer_text ?? null,
      flagged: false,
      hintViewed: saved?.hint_used ?? false,
      savedToServer: saved != null,
    };
  });
}

/**
 * Rehydrate local state from the server once, per attempt — runs on
 * mount/refresh/back-navigation when an in_progress attempt already
 * exists, so answers already saved via /answers aren't shown as blank.
 */
export function useAttemptHydration(args: {
  attemptProgress: AttemptProgressQuery;
  state: AttemptSessionState;
  focusTime: QuestionFocusTime;
  refs: AttemptSessionRefs;
}) {
  const { attemptProgress, state, focusTime, refs } = args;
  const { autoSubmitStartedRef, questionSeenAtRef, hydratedAttemptIdRef } =
    refs;
  const { taking } = state;

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

    state.setTaking(progress.take);
    state.setActiveAttemptId(progress.attempt_id);
    state.setStatuses(
      statusesFromProgress(
        sortedQuestions as QuizQuestionPublic[],
        answersByQuestion,
      ),
    );
    const firstUnanswered = sortedQuestions.findIndex(
      (q) => !answersByQuestion.get(q.id),
    );
    state.setActiveIdx(firstUnanswered === -1 ? 0 : firstUnanswered);

    const startedAtMs = new Date(progress.started_at).getTime();
    state.setQuizStartedAt(startedAtMs);
    state.setQuizElapsed(
      Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)),
    );
    const timeLimit = progress.take.quiz.time_limit_seconds ?? 0;
    if (timeLimit) {
      const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
      state.setTimeLeft(Math.max(0, timeLimit - elapsedSeconds));
    }
    autoSubmitStartedRef.current = false;
    // Restore per-question first-seen timestamps so the elapsed badge (and
    // the t_actual_ms we report) keep counting from the ORIGINAL first view,
    // not from this refresh/resume. Falls back to {} when nothing persisted.
    questionSeenAtRef.current = loadSeenAt(progress.attempt_id);
    // Restore banked attention time so a refresh doesn't reset every badge
    // (and every reported t_actual_ms) to zero.
    focusTime.reset(loadFocusMs(progress.attempt_id));
    state.setPerQuestionCooldown({});
  }, [attemptProgress.data, taking, focusTime]);
}
