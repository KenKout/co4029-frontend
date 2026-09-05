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
  const { configId, course, resumableSession, previousSessionsLoading } = route;
  const { sessionId } = turn;
  const { phase, finishResult, setFinishResult } = phaseState;

  // Typed turns go over `lk.chat` — there is no `/respond` hook any more.
  // Onboarding is the only REST turn surface left, and it has its own endpoint.
  const onboarding = useInterviewOnboarding(sessionId);
  const finish = useFinishInterview(sessionId, course?.id);
  // Poll-gating rationale for both queries below lives in interview-verdict.ts.
  const flags = resolveFinishFlags(finishResult);
  const { evaluationUnavailable } = flags;
  const { data: gapReport, isPending: gapReportPending } = useGapReport(
    flags.gapReportEnabled ? sessionId : null,
  );

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
  //
  // "Terminally fails" is the server's `evaluation_state === "exhausted"`, NOT
  // `status === "failed"`. Freezing on the status was the bug: ARQ stamps it
  // whenever one job runs out of retries, the backend recovery sweep re-drives
  // exactly those rows, and freezing killed the poll before the verdict landed.
  // The frozen `evaluation_state` is what keeps the poll off afterwards.
  useEffect(() => {
    if (!verdictPoll) return;
    const resolved = verdictPoll.pass_verdict;
    const settled = verdictPoll.evaluation_state === "exhausted";
    if ((resolved !== null && resolved !== undefined) || settled) {
      setFinishResult((prev) =>
        prev && prev.pass_verdict === null && prev.evaluation_state !== "exhausted"
          ? {
              ...prev,
              pass_verdict: resolved,
              status: verdictPoll.status,
              evaluation_state: verdictPoll.evaluation_state,
            }
          : prev,
      );
    }
  }, [verdictPoll]);

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
