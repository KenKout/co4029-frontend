import { useEffect } from "react";
import type {
  AttemptSessionRefs,
  StudentQuiz,
  SubmitAttemptMutation,
} from "./types";
import type { AttemptSessionState } from "./use-attempt-session-state";

/**
 * Auto-submit when a timed quiz's clock hits zero.
 *
 * The `autoSubmitStartedRef` latch is the submit-once guard: the effect re-runs
 * on every dependency change while `timeLeft` is 0, so without it a timed-out
 * attempt would POST /submit repeatedly.
 */
export function useAutoSubmitOnTimeout(args: {
  quiz: StudentQuiz;
  state: AttemptSessionState;
  refs: AttemptSessionRefs;
  sessionReady: boolean;
  submitAttempt: SubmitAttemptMutation;
  handleFinalSubmit: (trigger: "manual" | "timeout") => Promise<void>;
}) {
  const { quiz, state, refs, sessionReady, submitAttempt, handleFinalSubmit } =
    args;
  const { submittedSummary, timeLeft } = state;
  const { autoSubmitStartedRef } = refs;

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
}
