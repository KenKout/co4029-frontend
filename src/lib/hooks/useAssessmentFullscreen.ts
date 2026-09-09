/**
 * Fullscreen control for a proctored assessment (interview take or quiz take).
 *
 * The interview treats this API as a HARD GATE (see
 * `@/components/interview/use-interview-fullscreen-gate`): a session may not
 * start, present or speak until the browser has actually entered fullscreen.
 * The quiz keeps its softer deterrent policy on top of the same primitives.
 *
 * Browsers only grant `requestFullscreen()` from a user gesture, which is why
 * callers invoke `enter()` from a click handler — never automatically.
 *
 * The hook owns four things:
 *  - `isFullscreen` — live state, kept in sync with the `fullscreenchange` and
 *    `webkitfullscreenchange` events (so pressing Escape / F11 is observed,
 *    not just our own calls).
 *  - `isFullscreenNow` — the instant DOM check. React state can lag a render
 *    behind a `fullscreenchange`, so action guards must read the DOM, not the
 *    state, when deciding whether a click is still legal.
 *  - `supported`    — whether the API exists at all (older Safari / some mobile
 *    browsers expose no usable fullscreen).
 *  - automatic exit when the assessment is no longer active, so the results
 *    screen and any subsequent navigation return to the normal windowed app.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenCapableDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

/**
 * The element currently filling the screen, through the standard API or the
 * WebKit-prefixed one. Exported so downstream policy layers (the interview
 * fullscreen gate, the integrity reporter) test the SAME truth the hook does
 * instead of re-implementing the fallback chain.
 */
export function currentFullscreenElement(): Element | null {
  if (typeof document === "undefined") return null;
  const doc = document as FullscreenCapableDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function fullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement as FullscreenCapableElement | null;
  if (!root) return false;
  return Boolean(root.requestFullscreen ?? root.webkitRequestFullscreen);
}

export interface AssessmentFullscreenOptions {
  /**
   * Fired when fullscreen is lost while the assessment is still active and
   * the exit was NOT requested by us (Escape / F11 / OS gesture). Drives the
   * participant-facing warning. Our own programmatic exits are suppressed.
   */
  onUnexpectedExit?: () => void;
}

export function useAssessmentFullscreen(
  active: boolean,
  options: AssessmentFullscreenOptions = {},
) {
  const [supported] = useState(fullscreenSupported);
  const [isFullscreen, setIsFullscreen] = useState(() =>
    Boolean(currentFullscreenElement()),
  );
  // True while we are the ones leaving fullscreen (session ended, unmount, or
  // an explicit exit()) so the warning and the integrity log stay quiet.
  const intentionalExitRef = useRef(false);
  const onUnexpectedExitRef = useRef(options.onUnexpectedExit);
  onUnexpectedExitRef.current = options.onUnexpectedExit;
  const activeRef = useRef(active);
  activeRef.current = active;
  // One shared in-flight request: a double-click (or a dialog re-confirm racing
  // a second one) must issue ONE requestFullscreen, and both callers await the
  // same outcome. Without this, the second call would race the first and the
  // browser could reject it with TypeError while the first is still pending.
  const enterRequestRef = useRef<Promise<boolean> | null>(null);

  const markIntentional = useCallback(() => {
    intentionalExitRef.current = true;
    // Release the suppression after the event has been dispatched + batched by
    // the integrity reporter. Long enough for the browser transition, short
    // enough that a later manual exit is still reported.
    window.setTimeout(() => {
      intentionalExitRef.current = false;
    }, 1_000);
  }, []);

  useEffect(() => {
    function handleChange() {
      const next = Boolean(currentFullscreenElement());
      setIsFullscreen(next);
      if (next) return;
      if (!activeRef.current) return;
      if (intentionalExitRef.current) return;
      onUnexpectedExitRef.current?.();
    }

    // Both events, always: Safari fires only the webkit-prefixed one, so
    // listening to the standard event alone would lock the gate's UI state
    // (and the integrity log) out of every Safari transition.
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, []);

  const enter = useCallback(async () => {
    // Already fullscreen: a granted gate is a granted gate, whoever opened it.
    if (currentFullscreenElement()) return true;
    if (enterRequestRef.current) return enterRequestRef.current;
    const root = document.documentElement as FullscreenCapableElement | null;
    if (!root) return false;
    const request = root.requestFullscreen
      ? () => root.requestFullscreen({ navigationUI: "hide" })
      : root.webkitRequestFullscreen
        ? () => root.webkitRequestFullscreen?.()
        : null;
    if (!request) return false;
    const pending = (async () => {
      try {
        await request();
        // A resolved promise is NOT proof: some engines resolve before the
        // transition settles (and a permissions-policy rejection can race the
        // resolution). Only an element actually in the DOM counts.
        return Boolean(currentFullscreenElement());
      } catch {
        // Denied by the browser (no gesture, permissions policy, kiosk rules).
        // The CALLER decides what a refusal means — for the interview gate a
        // denial keeps the session locked; it is never silently windowed.
        return false;
      } finally {
        enterRequestRef.current = null;
      }
    })();
    enterRequestRef.current = pending;
    return pending;
  }, []);

  const exit = useCallback(
    async (intentional = true) => {
      if (!currentFullscreenElement()) return;
      if (intentional) markIntentional();
      const doc = document as FullscreenCapableDocument;
      const request = doc.exitFullscreen
        ? () => doc.exitFullscreen()
        : doc.webkitExitFullscreen
          ? () => doc.webkitExitFullscreen?.()
          : null;
      if (!request) return;
      try {
        await request();
      } catch {
        /* ignore — leaving fullscreen must never break the assessment */
      }
    },
    [markIntentional],
  );

  // Leave fullscreen as soon as the assessment stops being active (results
  // screen, abandoned session) and on unmount, so the rest of the app is never
  // stuck in a chromeless window.
  useEffect(() => {
    if (active) return;
    if (!currentFullscreenElement()) return;
    void exit(true);
  }, [active, exit]);

  useEffect(
    () => () => {
      if (currentFullscreenElement()) void exit(true);
    },
    [exit],
  );

  /** Instant DOM read — see the hook doc for why this must exist beside state. */
  const isFullscreenNow = useCallback(() => Boolean(currentFullscreenElement()), []);

  return {
    supported,
    isFullscreen,
    isFullscreenNow,
    enter,
    exit,
    /** True while a programmatic exit is in flight — integrity logging guard. */
    isIntentionalExit: useCallback(() => intentionalExitRef.current, []),
  };
}
