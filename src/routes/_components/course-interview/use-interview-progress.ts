import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { useFullscreenDeterrent } from "@/components/interview/use-fullscreen-deterrent";
import { useIntegrityReporter } from "@/components/interview/use-integrity-reporter";
import { resolveInterviewState } from "@/lib/interview/format";
import type { InterviewAgentStatus } from "@/lib/interview/types";
import { useInterviewTimer } from "@/lib/interview/use-interview-timer";
import { useQuestionPacing } from "@/lib/interview/use-question-pacing";
import { isInterviewActive } from "./helpers";
import type { useInterviewPhaseState } from "./use-interview-phase-state";
import type { useInterviewRouteData } from "./use-interview-route-data";
import type { useInterviewServerSync } from "./use-interview-server-sync";
import type { useInterviewSpeech } from "./use-interview-speech";
import type { useInterviewTurnState } from "./use-interview-turn-state";

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
  const { sessionId, currentQuestion, transcript } = turnState;
  const {
    phase,
    assessmentStartedAtMs,
    finishResult,
    connected,
    aiSpeaking,
    aiPresenting,
  } = phaseState;
  const { respond, onboarding } = serverSync;
  const { dictation } = speech;

  // Id of the most recently-added AI turn — only this one animates (types) and
  // speaks. Earlier AI turns render their full text immediately and silently.
  const elapsed = useInterviewTimer(
    assessmentStartedAtMs !== null &&
      phase !== "closing" &&
      phase !== "results",
    assessmentStartedAtMs,
  );
  const currentQuestionNumber = useMemo(() => {
    const questionIds = new Set(
      transcript
        .filter((turn) => turn.kind === "question")
        .map((turn) => turn.id),
    );
    return Math.max(1, questionIds.size);
  }, [transcript]);
  // The public learner API intentionally reveals questions one at a time and
  // currently does not expose a total. The header/card render an honest
  // indeterminate fallback until that existing nullable field is populated.
  const totalQuestions: number | null = null;
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

  // ── Immersive fullscreen (proctoring) ──────────────────────────────────────
  // A live session runs fullscreen with the app sidebar unmounted. Entering
  // fullscreen requires a user gesture, so it is gated behind a confirmation
  // dialog; leaving it mid-session raises a warning dialog (the exit itself is
  // already logged as an integrity event by useIntegrityReporter above).
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
  });
  // Fullscreen consent + exit-warning policy (ask once, count exits, reset on
  // session end) lives in useFullscreenDeterrent.
  const fullscreenDeterrent = useFullscreenDeterrent(interviewActive);

  // Once the session is over, restore the normal app shell (sidebar back).
  useEffect(() => {
    if (interviewActive) return;
    window.dispatchEvent(new CustomEvent("abridge:interview-ended"));
  }, [interviewActive]);

  const dictationHasError = Boolean(
    dictation.error && dictation.error !== "unsupported",
  );
  const agentStatus: InterviewAgentStatus = resolveInterviewState({
    connected,
    hasError: respond.isError || onboarding.isError || dictationHasError,
    thinking: respond.isPending || onboarding.isPending,
    speaking: aiSpeaking || aiPresenting,
    listening: dictation.listening,
    paused: dictation.paused,
  });

  return {
    elapsed,
    currentQuestionNumber,
    totalQuestions,
    questionPacing,
    fullscreenDeterrent,
    dictationHasError,
    agentStatus,
  };
}
