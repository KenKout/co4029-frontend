/**
 * Fullscreen control for the interview workspace.
 *
 * The interview runs in browser fullscreen so the candidate has no visible
 * chrome (tabs, bookmarks, app sidebar) to drift into. Browsers only grant
 * `requestFullscreen()` from a user gesture, which is why the caller shows a
 * confirmation dialog and calls `enter()` from that click — never automatically.
 *
 * The hook owns three things:
 *  - `isFullscreen` — live state, kept in sync with the `fullscreenchange` event
 *    (so pressing Escape / F11 is observed, not just our own calls).
 *  - `supported`    — whether the API exists at all (older Safari / some mobile
 *    browsers expose no usable fullscreen). The caller hides the prompt entirely
 *    when false rather than showing a dialog whose button cannot work.
 *  - automatic exit when the interview is no longer active, so the results
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

function currentFullscreenElement(): Element | null {
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

export interface InterviewFullscreenOptions {
  /**
   * Fired when fullscreen is lost while the interview is still active and the
   * exit was NOT requested by us (Escape / F11 / OS gesture). Drives the
   * candidate-facing warning. Our own programmatic exits are suppressed.
   */
  onUnexpectedExit?: () => void;
}

export function useInterviewFullscreen(
  active: boolean,
  options: InterviewFullscreenOptions = {},
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

    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, []);

  const enter = useCallback(async () => {
    const root = document.documentElement as FullscreenCapableElement | null;
    if (!root) return false;
    const request = root.requestFullscreen
      ? () => root.requestFullscreen({ navigationUI: "hide" })
      : root.webkitRequestFullscreen
        ? () => root.webkitRequestFullscreen?.()
        : null;
    if (!request) return false;
    try {
      await request();
      return true;
    } catch {
      // Denied by the browser (no gesture, permissions policy, kiosk rules).
      // The interview continues windowed — never block on this.
      return false;
    }
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
        /* ignore — leaving fullscreen must never break the interview */
      }
    },
    [markIntentional],
  );

  // Leave fullscreen as soon as the interview stops being active (results
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

  return {
    supported,
    isFullscreen,
    enter,
    exit,
    /** True while a programmatic exit is in flight — integrity logging guard. */
    isIntentionalExit: useCallback(() => intentionalExitRef.current, []),
  };
}
