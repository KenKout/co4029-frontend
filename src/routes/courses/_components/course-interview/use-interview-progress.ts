import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { useAssessmentFullscreenGate } from "@/lib/hooks/useAssessmentFullscreenGate";
import { useIntegrityReporter } from "@/components/interview/use-integrity-reporter";
import { resolveInterviewState } from "@/lib/interview/format";
import type {
  InterviewAgentStatus,
  InterviewSessionProgress,
} from "@/lib/interview/types";
import { useInterviewTimer } from "@/lib/interview/use-interview-timer";
import { useQuestionPacing } from "@/lib/interview/use-question-pacing";
import { isInterviewActive } from "./helpers";
import type { useInterviewPhaseState } from "./use-interview-phase-state";
import type { useInterviewRouteData } from "./use-interview-route-data";
import type { useInterviewServerSync } from "./use-interview-server-sync";
import type { useInterviewSpeech } from "./use-interview-speech";
import type { useInterviewTurnState } from "./use-interview-turn-state";

/**
 * Question count, total and rubric coverage for the header.
 *
 * The agent's snapshot is authoritative once it has published one. `fallbackNumber`
 * (counted off the transcript) covers the beat before the room is up and the
 * onboarding/REST-start phases that precede it, where there is no snapshot yet.
 *
 * `outcomeProgress` is what the pass/fail verdict is actually built from, so it is
 * the honest thing to draw the bar off — the question count only says how far
 * through the bank the interview is, not how much of the rubric is satisfied.
 */
function resolveProgressView(
  progress: InterviewSessionProgress | null,
  fallbackNumber: number,
): {
  currentQuestionNumber: number;
  totalQuestions: number | null;
  outcomeProgress: number | null;
} {
  if (!progress || progress.questionNumber <= 0) {
    return {
      currentQuestionNumber: fallbackNumber,
      totalQuestions: null,
      outcomeProgress: null,
    };
  }
  return {
    currentQuestionNumber: progress.questionNumber,
    // The learner API still exposes no total, but the snapshot does by
    // construction: the question it is on plus the ones the selector can offer.
    // The server's own pool size. Summing the index and the remainder mixed two
    // sources and let the denominator grow mid-interview.
    totalQuestions: progress.questionsTotal,
    outcomeProgress:
      progress.outcomesRequired > 0
        ? Math.min(
            100,
            (progress.outcomesCovered / progress.outcomesRequired) * 100,
          )
        : null,
  };
}

/**
 * Timers, pacing, proctoring signals and the derived agent status. Seventh hook
 * group in the page's hook order (see use-course-interview.ts) — moved verbatim
 * from course-interview.tsx.
 */
export function useInterviewProgress(
  route: ReturnType<typeof useInterviewRouteData>,
  turnState: ReturnType<typeof useInterviewTurnState>,
  phaseState: ReturnType<typeof useInterviewPhaseState>,
  serverSync: ReturnType<typeof useInterviewServerSync>,
  speech: ReturnType<typeof useInterviewSpeech>,
) {
  const { t } = route;
  const { sessionId, currentQuestion, transcript, answer } = turnState;
  const {
    phase,
    assessmentStartedAtMs,
    finishResult,
    connected,
    aiSpeaking,
    aiPresenting,
    turnPending,
    sessionProgress,
  } = phaseState;
  const { onboarding } = serverSync;
  const { micOn } = phaseState;

  // Id of the most recently-added AI turn — only this one animates (types) and
  // speaks. Earlier AI turns render their full text immediately and silently.
  const elapsed = useInterviewTimer(
    assessmentStartedAtMs !== null &&
      phase !== "closing" &&
      phase !== "results",
    assessmentStartedAtMs,
  );
  const transcriptQuestionNumber = useMemo(() => {
    const questionIds = new Set(
      transcript
        .filter((turn) => turn.kind === "question")
        .map((turn) => turn.id),
    );
    return Math.max(1, questionIds.size);
  }, [transcript]);
  const { currentQuestionNumber, totalQuestions, outcomeProgress } =
    resolveProgressView(sessionProgress, transcriptQuestionNumber);
  // Per-question pacing (#2): a gentle per-question elapsed cue in the header
  // (the session timer alone gives no signal of lingering on one question).
  const questionPacing = useQuestionPacing(
    sessionId,
    phase === "questioning" ? (currentQuestion?.id ?? null) : null,
    phase === "questioning",
  );
  // FR-5.8: record integrity signals (focus_lost / tab_switch / fullscreen_exit)
  // for the whole in-progress session in EVERY mode (text / hybrid / voice),
  // not just the voice room. The hook no-ops until sessionId exists, so it stays
  // inert on the prestart screen. This is the single mount point — VoiceRoom no
  // longer mounts its own (avoids duplicate POSTs when the voice branch renders).
  // FR-5.8 level-1 deterrent: nudge the candidate in real time when a
  // warning-level signal fires (tab switch / fullscreen exit). Throttled so a
  // burst of switches shows at most one toast per window — the recording is
  // unaffected, this is purely a visible reminder that the action is logged.
  const lastIntegrityWarnRef = useRef(0);
  const handleIntegrityWarning = useCallback(() => {
    const now = Date.now();
    if (now - lastIntegrityWarnRef.current < 10_000) return;
    lastIntegrityWarnRef.current = now;
    toast.warning(t("course_interview.integrity_warning.title"), {
      description: t("course_interview.integrity_warning.body"),
    });
  }, [t]);

  // Server-authoritative threshold warning (decision 2026-09-10): the ingest
  // response reports `warning_issued` exactly once per session, so this shows
  // the policy-level warning the lobby card promised — no local throttle
  // needed, the one-shot flag lives on the server row.
  const handleIntegrityThreshold = useCallback(() => {
    toast.warning(t("course_interview.integrity_threshold_warning.title"), {
      description: t("course_interview.integrity_threshold_warning.body"),
    });
  }, [t]);

  // ── Mandatory fullscreen gate ──────────────────────────────────────────────
  // A live session runs fullscreen with the app sidebar unmounted, and the
  // gate is HARD: while the session is active but the browser is not
  // fullscreen, the routes render InterviewFullscreenGateScreen INSTEAD of the
  // workspace (no transcript, no question, no composer, no AiTypingMessage)
  // and the room capabilities drop to all-false. `enter()` runs inside the
  // start/resume/retry click handlers (user gesture); an unexpected exit
  // (Escape / F11) increments exitCount and cancels in-flight narration via
  // the callback below — the gate never re-enters by itself (browsers require
  // a user gesture; the gate screen's Re-enter button is the path back).
  const interviewActive = isInterviewActive({
    sessionId,
    hasFinishResult: Boolean(finishResult),
    phase,
  });

  // Integrity monitoring is scoped to the LIVE session, not to the session id.
  //
  // `sessionId` outlives the interview: it is still set on the results screen,
  // so gating on it alone kept the tab-switch / fullscreen-exit listeners
  // attached while the candidate read their verdict and study plan. Reading the
  // recommended material means leaving the tab — which fired a "this is logged"
  // toast and POSTed integrity events for behaviour that is not only allowed
  // but encouraged at that point.
  //
  // `interviewActive` is already false once `finishResult` lands (and for the
  // prestart screen), so passing it here stops monitoring at exactly the moment
  // the assessment ends. Recording during the live session is unchanged.
  useIntegrityReporter(interviewActive ? sessionId : null, {
    onWarning: handleIntegrityWarning,
    onThresholdWarning: handleIntegrityThreshold,
  });
  // The mandatory gate (locked-until-granted policy, request state, exit
  // count) — replaces the old deterrent. Mounted on EVERY render while active
  // so the timer/integrity hooks above keep running behind the gate screen;
  // the narration-cancel callback cuts the client voice the moment
  // fullscreen is lost mid-speech.
  const fullscreenGate = useAssessmentFullscreenGate(interviewActive, {
    onUnexpectedExit: () => speech.narration.cancel(),
  });

  // Once the session is over, restore the normal app shell (sidebar back).
  useEffect(() => {
    if (interviewActive) return;
    window.dispatchEvent(new CustomEvent("abridge:interview-ended"));
  }, [interviewActive]);

  const agentStatus: InterviewAgentStatus = resolveInterviewState({
    connected,
    hasError: answer.state.status === "failed" || onboarding.isError,
    thinking: turnPending || onboarding.isPending,
    speaking: aiSpeaking || aiPresenting,
    // A published mic IS the candidate holding the floor.
    listening: micOn,
  });

  return {
    elapsed,
    currentQuestionNumber,
    totalQuestions,
    outcomeProgress,
    questionPacing,
    fullscreenGate,
    agentStatus,
  };
}
