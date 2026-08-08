import { useEffect, useRef } from "react";

import {
  useFinishInterview,
  useGapReport,
  useInterviewOnboarding,
  useInterviewSession,
} from "@/lib/api/hooks/interviews";
import { resolveFinishFlags, resolveVerdictState } from "./interview-verdict";
import type { useInterviewPhaseState } from "./use-interview-phase-state";
import type { useInterviewRouteData } from "./use-interview-route-data";
import type { useInterviewTurnState } from "./use-interview-turn-state";

/**
 * Session mutations plus every server-driven poll: auto-resume, the async
 * pass/fail verdict and voice-completion detection. Fifth hook group in the
 * page's hook order (see use-course-interview.ts) — moved verbatim from
 * course-interview.tsx.
 */
export function useInterviewServerSync(
  route: ReturnType<typeof useInterviewRouteData>,
  turn: ReturnType<typeof useInterviewTurnState>,
  phaseState: ReturnType<typeof useInterviewPhaseState>,
) {
  const { configId, resumableSession, previousSessionsLoading } = route;
  const { sessionId } = turn;
  const {
    phase,
    setPhase,
    finishResult,
    setFinishResult,
    setInputMode,
    pollingCompletion,
    setPollingCompletion,
  } = phaseState;

  // No `useInterviewRespond` here. Typed turns go over `lk.chat`; onboarding is
  // the only REST turn surface left, and it has its own endpoint.
  const onboarding = useInterviewOnboarding(sessionId);
  const finish = useFinishInterview(sessionId);
  // Poll-gating rationale for both queries below lives in interview-verdict.ts.
  const flags = resolveFinishFlags(finishResult);
  const { evaluationUnavailable } = flags;
  const { data: gapReport, isPending: gapReportPending } = useGapReport(
    flags.gapReportEnabled ? sessionId : null,
  );

  useEffect(() => {
    if (!sessionId && resumableSession) {
      setInputMode(resumableSession.input_mode);
    }
  }, [resumableSession, sessionId]);

  // Auto-resume on reload (resilience A-Tier-1 #1). A mid-interview refresh
  // otherwise dumps the student back to the lobby with a manual "Resume" button.
  // We stamp a sessionStorage marker while the interview is live; on mount, if a
  // resumable in-progress session exists AND its marker is present (i.e. this is
  // a genuine reload of an active attempt, not a fresh lobby visit), we resume
  // automatically. sessionStorage survives reload but not tab-close, so a fresh
  // navigation still shows the lobby + Resume button (never surprises the user).
  const ACTIVE_MARKER_KEY = `abridge:iv-active:${configId}`;
  const autoResumeTriedRef = useRef(false);
  // handleStart lives in useInterviewActions, which runs AFTER this hook group.
  // In the pre-split file the auto-resume effect below reached it through
  // function hoisting; this ref is the same "read the current declaration at
  // call time" contract, assigned during render before any effect can fire.
  const startHandlerRef = useRef<() => Promise<void>>(() => Promise.resolve());
  useEffect(() => {
    // Stamp / clear the "live attempt" marker as the session goes active/ends.
    try {
      if (sessionId && phase !== "prestart" && phase !== "results") {
        window.sessionStorage.setItem(ACTIVE_MARKER_KEY, sessionId);
      } else if (phase === "results") {
        window.sessionStorage.removeItem(ACTIVE_MARKER_KEY);
      }
    } catch {
      /* storage unavailable — auto-resume is best-effort */
    }
  }, [sessionId, phase, ACTIVE_MARKER_KEY]);

  useEffect(() => {
    if (autoResumeTriedRef.current) return;
    if (sessionId || !resumableSession || previousSessionsLoading) return;
    // Read inside a try because sessionStorage throws in some privacy modes;
    // a failed read means "no marker", i.e. do not auto-resume.
    let marker: string | null;
    try {
      marker = window.sessionStorage.getItem(ACTIVE_MARKER_KEY);
    } catch {
      marker = null;
    }
    // Only auto-resume a genuine reload of THIS live attempt.
    if (marker !== resumableSession.session_id) return;
    autoResumeTriedRef.current = true;
    void startHandlerRef.current();
    // handleStart is a stable declaration read at call time; resumableSession /
    // loading are the real triggers. Guarded by the ref so it fires once.
  }, [resumableSession, sessionId, previousSessionsLoading, ACTIVE_MARKER_KEY]);

  const { data: verdictPoll } = useInterviewSession(
    flags.verdictPollEnabled ? sessionId : null,
    { refetchInterval: 3000 },
  );
  const { liveVerdict, evaluationFailed, verdictPending } = resolveVerdictState(
    {
      finishResult,
      verdictPoll,
      flags,
    },
  );

  // Once the polled verdict resolves OR the evaluation terminally fails,
  // freeze it into finishResult so the poll's `enabled` flips to false
  // (finishVerdict/status are otherwise the frozen values from the /finish
  // response and would keep the poll running forever).
  useEffect(() => {
    if (!verdictPoll) return;
    const resolved = verdictPoll.pass_verdict;
    const failed = verdictPoll.status === "failed";
    if ((resolved !== null && resolved !== undefined) || failed) {
      setFinishResult((prev) =>
        prev && prev.pass_verdict === null && prev.status !== "failed"
          ? { ...prev, pass_verdict: resolved, status: verdictPoll.status }
          : prev,
      );
    }
  }, [verdictPoll]);

  // Poll session status (every 2s) when voice completes to detect the
  // server-side finish. TanStack Query does not poll by default, so the
  // refetchInterval is required — without it the status is fetched once and
  // the user can hang forever if the commit lands a moment later.
  const { data: sessionStatus } = useInterviewSession(
    pollingCompletion ? sessionId : null,
    { refetchInterval: 2000 },
  );

  // Stop polling on ANY terminal status (completed/timed_out/abandoned/failed)
  // and surface the result. Scores/verdict are produced by the async
  // evaluation and appear via the gap report (same as text mode).
  useEffect(() => {
    if (!pollingCompletion || !sessionStatus) return;
    const terminal = ["completed", "timed_out", "abandoned", "failed"];
    if (terminal.includes(sessionStatus.status)) {
      setPollingCompletion(false);
      setPhase("results");
      setFinishResult({
        session_id: sessionStatus.session_id,
        status: sessionStatus.status,
        pass_verdict: sessionStatus.pass_verdict ?? null,
        total_score: null,
        rubric_scores: [],
      });
    }
  }, [pollingCompletion, sessionStatus]);

  return {
    onboarding,
    finish,
    evaluationUnavailable,
    gapReport,
    gapReportPending,
    startHandlerRef,
    verdictPoll,
    liveVerdict,
    evaluationFailed,
    verdictPending,
  };
}
