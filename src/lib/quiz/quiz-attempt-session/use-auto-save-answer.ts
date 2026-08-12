import { useEffect } from "react";

import { hasAnswer } from "@/lib/quiz/quiz-session-helpers";
import type { AttemptSessionState } from "./use-attempt-session-state";

/**
 * Debounced auto-save of the student's answer.
 *
 * Answers persist automatically ~800ms after the student stops typing /
 * picks an option — the Save button is gone from the UI. The first dirty,
 * answered status wins (with per-question editing only one is ever dirty at
 * a time; a failing save leaves it dirty and the toast surfaces the error).
 * `persistAnswer` is idempotent and marks the status saved on success, which
 * re-triggers this effect into a no-op.
 */
export function useAutoSaveAnswer(args: {
  state: AttemptSessionState;
  sessionReady: boolean;
  activeAttemptId: string | null;
  persistAnswer: (questionIdx: number) => Promise<boolean>;
}): void {
  const { state, sessionReady, activeAttemptId, persistAnswer } = args;

  useEffect(() => {
    if (!sessionReady || !activeAttemptId) return;
    const idx = state.statuses.findIndex(
      (s) => s && hasAnswer(s) && !s.savedToServer,
    );
    if (idx < 0) return;

    const timer = window.setTimeout(() => {
      void persistAnswer(idx);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [
    state.statuses,
    sessionReady,
    activeAttemptId,
    persistAnswer,
  ]);
}
