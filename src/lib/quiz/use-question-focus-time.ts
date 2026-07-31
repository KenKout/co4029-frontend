import { useCallback, useEffect, useRef } from "react";

/**
 * Per-question ATTENTION time, for the SM-2 `t_actual_ms` signal.
 *
 * ## Why not elapsed wall-clock
 *
 * The original model measured `Date.now() - firstSeenAt`, which only
 * approximates effort when exactly one question is on screen. With
 * all-questions-on-one-page or paginated batches that breaks down: every
 * mounted question would accrue time simultaneously, and a student who answers
 * Q1, jumps to Q5, then returns would have the detour billed to whichever
 * question happened to be "active".
 *
 * This hook instead accumulates time only while a question is BOTH
 * scrolled into view and the tab is focused. In single-question mode that
 * reduces to the old behaviour (only one question is ever mounted/visible), so
 * the same measurement works across all three layouts.
 *
 * ## Why coarse precision is fine
 *
 * `derive_q` (backend `sm2/q_derivation.py`) buckets the ratio
 * ρ = t_actual / t_expected into just three outcomes for an unhinted correct
 * answer: ρ < 0.5 → Q=5, 0.5 ≤ ρ < 1 → Q=4, ρ ≥ 1 → Q=3. We are feeding a
 * 3-bucket classifier, not a continuous function, so we need the right bucket —
 * not millisecond fidelity.
 *
 * ## The cap
 *
 * ρ is unbounded above but Q floors at 3, so 61s and one hour are identical to
 * the model. Capping accumulated time at `capMultiplier` × expected therefore
 * costs no fidelity while removing the "walked away from the desk" distortion
 * that plagued the wall-clock approach.
 */

/** Multiple of the expected time beyond which extra time cannot change Q. */
export const FOCUS_TIME_CAP_MULTIPLIER = 3;

export interface QuestionFocusTimeApi {
  /**
   * Ref callback to attach to each question's container element. Pass the
   * question id; pass `null` as the node on unmount (React does this for you).
   */
  register: (questionId: string) => (node: HTMLElement | null) => void;
  /**
   * Accumulated focus time for a question, in ms, capped when an expected time
   * is supplied. Returns `null` when the question was never observed — callers
   * should send `null` rather than 0 so the backend applies its neutral ρ=1.0
   * fallback instead of recording an implausible instant answer.
   */
  getFocusMs: (questionId: string, expectedMs?: number | null) => number | null;
  /** Live (uncapped) focus time, for the on-screen per-question badge. */
  peekFocusMs: (questionId: string) => number;
  /** Drop all accumulated timing (new attempt). */
  reset: (seed?: Record<string, number>) => void;
  /** Snapshot of accumulated totals, for persisting across a refresh. */
  snapshot: () => Record<string, number>;
}

export function useQuestionFocusTime(options?: {
  /** Fraction of the element that must be visible to count as attended. */
  threshold?: number;
  /** Pause accumulation entirely (e.g. after the attempt is submitted). */
  paused?: boolean;
}): QuestionFocusTimeApi {
  const threshold = options?.threshold ?? 0.35;
  const paused = options?.paused ?? false;

  // questionId -> accumulated ms from all completed segments.
  const totals = useRef<Record<string, number>>({});
  // questionId -> epoch ms when the current open segment began (absent = closed).
  const openSince = useRef<Record<string, number>>({});
  // questionId -> whether the element is currently intersecting.
  const onScreen = useRef<Record<string, boolean>>({});
  const nodes = useRef<Map<string, HTMLElement>>(new Map());
  const observer = useRef<IntersectionObserver | null>(null);
  const pausedRef = useRef(paused);

  /** Close an open segment, folding its duration into the running total. */
  const closeSegment = useCallback((questionId: string) => {
    const since = openSince.current[questionId];
    if (since == null) return;
    delete openSince.current[questionId];
    totals.current[questionId] =
      (totals.current[questionId] ?? 0) + Math.max(0, Date.now() - since);
  }, []);

  const openSegment = useCallback((questionId: string) => {
    if (pausedRef.current) return;
    if (openSince.current[questionId] != null) return;
    if (typeof document !== "undefined" && document.hidden) return;
    if (!onScreen.current[questionId]) return;
    openSince.current[questionId] = Date.now();
  }, []);

  // Tab focus / visibility gating. A backgrounded tab must not accrue time —
  // that was one of the ways the old wall-clock measure drifted.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      if (document.hidden) {
        Object.keys(openSince.current).forEach(closeSegment);
      } else {
        Object.keys(onScreen.current).forEach((id) => {
          if (onScreen.current[id]) openSegment(id);
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [closeSegment, openSegment]);

  // Reflect `paused` into a ref and stop the clock when it flips on, so a
  // submitted attempt can't keep accruing while the summary renders.
  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      Object.keys(openSince.current).forEach(closeSegment);
    } else {
      Object.keys(onScreen.current).forEach((id) => {
        if (onScreen.current[id]) openSegment(id);
      });
    }
  }, [paused, closeSegment, openSegment]);

  // Close every open segment on unmount so in-flight time isn't lost.
  useEffect(
    () => () => {
      Object.keys(openSince.current).forEach((id) => {
        const since = openSince.current[id];
        if (since == null) return;
        delete openSince.current[id];
        totals.current[id] =
          (totals.current[id] ?? 0) + Math.max(0, Date.now() - since);
      });
    },
    [],
  );

  function ensureObserver(): IntersectionObserver | null {
    if (typeof IntersectionObserver === "undefined") return null;
    if (observer.current) return observer.current;
    observer.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.qfocusId;
          if (!id) continue;
          const visible =
            entry.isIntersecting && entry.intersectionRatio >= threshold;
          onScreen.current[id] = visible;
          if (visible) openSegment(id);
          else closeSegment(id);
        }
      },
      // A band of thresholds so we get an event on the way in AND out.
      { threshold: [0, threshold, Math.min(1, threshold + 0.25), 1] },
    );
    return observer.current;
  }

  useEffect(
    () => () => {
      observer.current?.disconnect();
      observer.current = null;
    },
    [],
  );

  const register = useCallback(
    (questionId: string) => (node: HTMLElement | null) => {
      const existing = nodes.current.get(questionId);
      if (existing && existing !== node) {
        observer.current?.unobserve(existing);
        // Element is going away: bank whatever time it had accrued.
        closeSegment(questionId);
        onScreen.current[questionId] = false;
        nodes.current.delete(questionId);
      }
      if (!node) return;
      node.dataset.qfocusId = questionId;
      nodes.current.set(questionId, node);
      const obs = ensureObserver();
      if (obs) {
        obs.observe(node);
      } else {
        // No IntersectionObserver (jsdom / very old browsers): fall back to
        // "mounted means attended", which matches the pre-existing behaviour
        // rather than silently reporting zero.
        onScreen.current[questionId] = true;
        openSegment(questionId);
      }
    },
    // ensureObserver is stable in practice (only reads refs + threshold).

    [closeSegment, openSegment, threshold],
  );

  const peekFocusMs = useCallback((questionId: string) => {
    const banked = totals.current[questionId] ?? 0;
    const since = openSince.current[questionId];
    return since == null ? banked : banked + Math.max(0, Date.now() - since);
  }, []);

  const getFocusMs = useCallback(
    (questionId: string, expectedMs?: number | null) => {
      const seen =
        totals.current[questionId] != null ||
        openSince.current[questionId] != null;
      if (!seen) return null;
      const raw = peekFocusMs(questionId);
      if (expectedMs && expectedMs > 0) {
        return Math.min(raw, expectedMs * FOCUS_TIME_CAP_MULTIPLIER);
      }
      return raw;
    },
    [peekFocusMs],
  );

  const reset = useCallback((seed?: Record<string, number>) => {
    totals.current = { ...(seed ?? {}) };
    openSince.current = {};
  }, []);

  const snapshot = useCallback(() => {
    const out: Record<string, number> = { ...totals.current };
    for (const id of Object.keys(openSince.current)) {
      out[id] = peekFocusMs(id);
    }
    return out;
  }, [peekFocusMs]);

  return { register, getFocusMs, peekFocusMs, reset, snapshot };
}

export default useQuestionFocusTime;
