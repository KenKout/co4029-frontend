import { useCallback, useEffect, useRef } from "react";

/**
 * Per-question response-time tracking for the quiz-taking screen.
 *
 * Model (agreed spec):
 * - Each question accumulates *active* on-screen time. The timer PAUSES
 *   whenever the question is off-screen (student swapped to another
 *   question) or the tab is hidden (blur / minimise / lock screen).
 * - The recorded response time (`snapshot`) is the cumulative active time
 *   AT THE MOMENT THE ANSWER WAS LAST CHANGED. It only moves when the
 *   answer actually changes.
 * - Active time keeps accruing silently even while the answer is
 *   unchanged, so a *later* change re-snapshots the full cumulative
 *   active time (answer → swap away → come back → change ⇒ snapshot
 *   includes both on-screen stretches, excludes the time away).
 *
 * The snapshot is what gets sent to the server as `t_actual_ms`.
 */
interface TimerEntry {
  /** Active time banked from completed on-screen segments (ms). */
  accumulatedMs: number;
  /** Wall-clock start of the current running segment, or null if paused. */
  activeSince: number | null;
  /** Cumulative active time captured at the last answer change (ms). */
  snapshotMs: number | null;
}

export interface ResponseTimers {
  /** Capture the current cumulative active time as this question's response time. */
  markAnswerChanged: (questionId: string) => void;
  /** Latest snapshot for a question (ms), or null if never answered. */
  getSnapshot: (questionId: string) => number | null;
  /** Cumulative ACTIVE time so far for a question (ms), including the
   *  currently-running segment. Live value for on-screen display; unlike
   *  getSnapshot it moves every tick while the question is on-screen. */
  getLiveActiveMs: (questionId: string) => number;
  /** Wipe all timing state (call when a fresh attempt starts). */
  reset: () => void;
}

export function useResponseTimers(
  activeQuestionId: string | undefined,
  running: boolean,
): ResponseTimers {
  const timers = useRef<Map<string, TimerEntry>>(new Map());
  const currentIdRef = useRef<string | undefined>(undefined);
  const runningRef = useRef(running);
  runningRef.current = running;

  const ensure = useCallback((id: string): TimerEntry => {
    let entry = timers.current.get(id);
    if (!entry) {
      entry = { accumulatedMs: 0, activeSince: null, snapshotMs: null };
      timers.current.set(id, entry);
    }
    return entry;
  }, []);

  const liveActiveMs = useCallback((entry: TimerEntry): number => {
    return (
      entry.accumulatedMs +
      (entry.activeSince != null ? Date.now() - entry.activeSince : 0)
    );
  }, []);

  const pause = useCallback((id: string | undefined) => {
    if (!id) return;
    const entry = timers.current.get(id);
    if (entry && entry.activeSince != null) {
      entry.accumulatedMs += Date.now() - entry.activeSince;
      entry.activeSince = null;
    }
  }, []);

  const resume = useCallback(
    (id: string | undefined) => {
      if (!id || !runningRef.current) return;
      const entry = ensure(id);
      if (entry.activeSince == null) entry.activeSince = Date.now();
    },
    [ensure],
  );

  // Start/stop the running segment as the active question changes or the
  // attempt starts/ends. Pausing the outgoing question banks its segment.
  useEffect(() => {
    const previousId = currentIdRef.current;
    if (previousId && previousId !== activeQuestionId) pause(previousId);
    currentIdRef.current = activeQuestionId;
    if (running) resume(activeQuestionId);
    else pause(activeQuestionId);
    return () => {
      // Unmount / dep change: bank the current segment so no active time leaks.
      pause(currentIdRef.current);
    };
  }, [activeQuestionId, running, pause, resume]);

  // Pause when the tab is hidden (blur, minimise, lock, background), resume
  // on return — so time spent off the page never counts toward a question.
  useEffect(() => {
    function onVisibilityChange() {
      const id = currentIdRef.current;
      if (!id) return;
      if (document.hidden) pause(id);
      else resume(id);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [pause, resume]);

  const markAnswerChanged = useCallback(
    (questionId: string) => {
      const entry = ensure(questionId);
      entry.snapshotMs = Math.round(liveActiveMs(entry));
    },
    [ensure, liveActiveMs],
  );

  const getSnapshot = useCallback((questionId: string): number | null => {
    return timers.current.get(questionId)?.snapshotMs ?? null;
  }, []);

  const getLiveActiveMs = useCallback(
    (questionId: string): number => {
      const entry = timers.current.get(questionId);
      return entry ? Math.round(liveActiveMs(entry)) : 0;
    },
    [liveActiveMs],
  );

  const reset = useCallback(() => {
    timers.current = new Map();
    currentIdRef.current = undefined;
  }, []);

  return { markAnswerChanged, getSnapshot, getLiveActiveMs, reset };
}
