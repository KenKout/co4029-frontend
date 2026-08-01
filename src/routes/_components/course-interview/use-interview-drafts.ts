import { useCallback, useEffect, useRef } from "react";
import { useBlocker } from "@tanstack/react-router";

import { useDraftAutosave } from "@/lib/interview/use-draft-autosave";
import type { useInterviewPhaseState } from "./use-interview-phase-state";
import type { useInterviewTurnState } from "./use-interview-turn-state";

/**
 * Answer-draft persistence, connectivity listeners, the leave blocker and the
 * server-authoritative deadline reconciler. Fourth hook group in the page's hook
 * order (see use-course-interview.ts) — moved verbatim from course-interview.tsx.
 */
export function useInterviewDrafts(
  turn: ReturnType<typeof useInterviewTurnState>,
  phaseState: ReturnType<typeof useInterviewPhaseState>,
) {
  const {
    sessionId,
    currentQuestion,
    answerText,
    setAnswerText,
    answer,
    resetAnswerForQuestion,
    restoreDraft,
  } = turn;
  const {
    phase,
    pollingCompletion,
    setConnected,
    sessionDeadlineAtRef,
    timeoutTriggeredRef,
  } = phaseState;

  // A genuinely new question resets the answer machine to a clean draft keyed
  // by the new id (spec §7). The reducer no-ops when the id is unchanged, so an
  // unrelated rerender that recomputes the same id never wipes the draft. The
  // `recentSubmission` confirmation intentionally survives so it can collapse
  // into "✓ Previous answer submitted" rather than vanishing.
  useEffect(() => {
    if (currentQuestion?.id) resetAnswerForQuestion(currentQuestion.id);
  }, [currentQuestion?.id, resetAnswerForQuestion]);

  // Answer-draft autosave (resilience A-Tier-1 #2): mirror the composer text
  // into localStorage keyed by session+question so a reload / crash / accidental
  // navigation mid-question never loses a half-typed answer.
  const draftAutosave = useDraftAutosave(
    sessionId,
    currentQuestion?.id ?? null,
    answerText,
  );
  const { restore: restoreDraftAutosave, clear: clearDraftAutosave } =
    draftAutosave;

  // On (re)entering a question during active questioning, rehydrate any draft
  // persisted for THIS session+question. Runs only while the composer is live
  // and empty, so it restores after a reload without clobbering fresh typing or
  // a just-submitted state. Keyed by question id so each question restores once.
  const restoredQuestionRef = useRef<string | null>(null);
  useEffect(() => {
    const qid = currentQuestion?.id;
    if (!qid || phase !== "questioning") return;
    if (restoredQuestionRef.current === qid) return;
    restoredQuestionRef.current = qid;
    if (answer.state.status !== "draft" || answerText.trim()) return;
    const saved = restoreDraftAutosave();
    if (saved) {
      setAnswerText(saved);
      restoreDraft(saved);
    }
    // answerText/answer.state are read as a one-shot guard at question entry;
    // re-running on their every change would fight live typing.
  }, [currentQuestion?.id, phase, restoreDraftAutosave]);

  useEffect(() => {
    const handleOnline = () => setConnected(true);
    const handleOffline = () => setConnected(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const shouldBlockInterviewExit = Boolean(
    sessionId &&
      !pollingCompletion &&
      (phase === "opening" ||
        phase === "readiness" ||
        phase === "transition" ||
        phase === "questioning"),
  );
  const leaveBlocker = useBlocker({
    shouldBlockFn: () => shouldBlockInterviewExit,
    enableBeforeUnload: shouldBlockInterviewExit,
    disabled: !shouldBlockInterviewExit,
    withResolver: true,
  });

  // Server-authoritative timer reconciliation (resilience A-Tier-1 #4): the
  // backend returns the true whole-second countdown on each turn. Re-anchor the
  // locally computed deadline to the server clock so client clock skew or a
  // throttled background tab can't drift the timeout. Ignored when the session
  // has no time limit (server returns null) or the value is non-finite.
  const reconcileDeadline = useCallback((remainingSeconds?: number | null) => {
    if (remainingSeconds == null || !Number.isFinite(remainingSeconds)) return;
    sessionDeadlineAtRef.current = Date.now() + remainingSeconds * 1000;
    timeoutTriggeredRef.current = false;
  }, []);

  return {
    restoreDraftAutosave,
    clearDraftAutosave,
    shouldBlockInterviewExit,
    leaveBlocker,
    reconcileDeadline,
  };
}
