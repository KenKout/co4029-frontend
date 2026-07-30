/**
 * Per-question elapsed pacing for an in-progress interview.
 *
 * The interview header shows a whole-SESSION timer, but gives no signal of how
 * long the candidate has lingered on the *current* question. For a timed
 * assessment that per-question cue matters — a student sinking five minutes into
 * one question benefits from a gentle nudge to move on.
 *
 * This mirrors the quiz feature's `lib/quiz-timing.ts` approach: we anchor a
 * "first seen" epoch-ms timestamp per question, persisted to localStorage keyed
 * by session id so a reload/crash keeps counting from the real first-view time
 * instead of restarting at 00:00. Best-effort — any storage error (quota,
 * private mode) is swallowed; this is an accuracy enhancement, never a
 * correctness dependency.
 */

import { useEffect, useMemo, useRef, useState } from "react";

const KEY_PREFIX = "abridgeai.interviewpacing.";

/** `{ [questionId]: epochMillisWhenFirstSeen }` for one session. */
type SeenAt = Record<string, number>;

function keyFor(sessionId: string): string {
  return `${KEY_PREFIX}${sessionId}`;
}

function loadSeenAt(sessionId: string): SeenAt {
  try {
    const raw = window.localStorage.getItem(keyFor(sessionId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: SeenAt = {};
    for (const [qid, ts] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof ts === "number" && Number.isFinite(ts) && ts > 0) {
        out[qid] = ts;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveSeenAt(sessionId: string, seenAt: SeenAt): void {
  try {
    window.localStorage.setItem(keyFor(sessionId), JSON.stringify(seenAt));
  } catch {
    // Quota exceeded / storage disabled — pacing mirror is best-effort.
  }
}

export function clearQuestionPacing(sessionId: string): void {
  try {
    window.localStorage.removeItem(keyFor(sessionId));
  } catch {
    // ignore
  }
}

export type QuestionPacing = {
  /** Whole seconds the candidate has spent on the current question. */
  elapsedSeconds: number;
  /**
   * True once elapsed crosses the "lingering" threshold — the UI uses this to
   * switch to a gentle amber nudge tone. Never blocks or auto-advances.
   */
  lingering: boolean;
};

/**
 * Track per-question elapsed time.
 *
 * @param sessionId   Active session id (persistence key). Null disables tracking.
 * @param questionId  Current question id. Null (onboarding / closing) pauses the ticker.
 * @param active      Whether the assessment is in the questioning phase.
 * @param lingerAfterSeconds  Threshold for the "lingering" nudge (default 180s).
 */
export function useQuestionPacing(
  sessionId: string | null,
  questionId: string | null,
  active: boolean,
  lingerAfterSeconds = 180,
): QuestionPacing {
  const seenRef = useRef<SeenAt>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Load the persisted anchors once per session.
  useEffect(() => {
    seenRef.current = sessionId ? loadSeenAt(sessionId) : {};
  }, [sessionId]);

  // Anchor the current question's first-seen time (persisted) when it appears.
  useEffect(() => {
    if (!sessionId || !questionId || !active) return;
    if (seenRef.current[questionId] === undefined) {
      seenRef.current[questionId] = Date.now();
      saveSeenAt(sessionId, seenRef.current);
    }
    // Recompute immediately so a reload doesn't flash 0s.
    setElapsedSeconds(
      Math.max(
        0,
        Math.floor((Date.now() - seenRef.current[questionId]) / 1000),
      ),
    );
  }, [sessionId, questionId, active]);

  // Tick once per second while active on a question.
  useEffect(() => {
    if (!questionId || !active) {
      setElapsedSeconds(0);
      return;
    }
    const tick = () => {
      const anchor = seenRef.current[questionId];
      if (anchor === undefined) return;
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - anchor) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [questionId, active]);

  return useMemo(
    () => ({
      elapsedSeconds,
      lingering: elapsedSeconds >= lingerAfterSeconds,
    }),
    [elapsedSeconds, lingerAfterSeconds],
  );
}
