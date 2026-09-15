/**
 * The MANDATORY fullscreen gate shared by every proctored assessment.
 *
 * Policy only — the browser primitives live in `useAssessmentFullscreen`. This
 * hook turns them from a proctoring *deterrent* ("please go fullscreen; a
 * denied request is fine, keep going windowed") into a hard *gate*: a live
 * session with no fullscreen is LOCKED. What that means concretely is decided
 * by the routes (they render `InterviewFullscreenGateScreen` instead of the
 * workspace whenever `requiredOpen` is true) and by the action guards (they
 * refuse to send while `isFullscreenNow()` is false) — nothing here mounts or
 * unmounts presentation itself.
 *
 * Replaces `useFullscreenDeterrent`. The differences that
 * matter:
 *  - No consent prompt and no dismissal: entering is part of starting, and the
 *    only way out of the gate is a granted fullscreen request (or the session
 *    ending / the candidate leaving through the normal leave flow).
 *  - `requestState` tells the gate screen what to show: requesting (spinner,
 *    submit locked), denied (retry guidance), unsupported (change browser).
 *  - An unexpected exit (Escape / F11) increments `exitCount` for the
 *    integrity messaging and fires the caller's cancel callback — which is
 *    where in-flight narration is cut — but never re-enters by itself: a
 *    browser requires a user gesture, so the gate screen's Re-enter button
 *    is the path back.
 *  - The exit verdict can be DEFERRED: `pendingExit` is true from the moment
 *    fullscreen is lost until the caller calls `resolveExit(accepted)`. The
 *    interview gate uses this to show a Back / Continue confirmation — an
 *    accidental Escape that is undone by re-entering fullscreen is NOT scored,
 *    while an accepted windowed exit is. `pendingExit` clears by itself when
 *    the browser re-enters fullscreen on its own (F11) or the session ends.
 *  - Everything resets when the session is no longer active.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  useAssessmentFullscreen,
  currentFullscreenElement,
} from "./useAssessmentFullscreen";

export type FullscreenRequestState =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unsupported";

export interface AssessmentFullscreenGate {
  /** Whether the browser exposes any usable fullscreen API at all. */
  supported: boolean;
  /** React-state view of fullscreen — drives the screens. */
  isFullscreen: boolean;
  /**
   * Instant DOM check for ACTION GUARDS. React state can lag one render behind
   * a `fullscreenchange`, so "may this click still send?" must read the DOM.
   */
  isFullscreenNow: () => boolean;
  /** idle → requesting → granted | denied (or unsupported, no request). */
  requestState: FullscreenRequestState;
  /**
   * Ask the browser for fullscreen. Call from a user gesture (dialog confirm /
   * re-enter button). Resolves true only when the DOM actually has a
   * fullscreen element; a denial keeps the gate LOCKED — it never falls back
   * to windowed.
   */
  enter: () => Promise<boolean>;
  /** Programmatic exit (start failure, session end). Intentional by default. */
  exit: (intentional?: boolean) => Promise<void>;
  /**
   * True while an unexpected exit awaits its verdict. The interview gate
   * shows its Back / Continue confirmation during this window; calling
   * `resolveExit` settles it. Quiz never reads this and keeps the hard gate.
   */
  pendingExit: boolean;
  /**
   * Settle a pending exit. `accepted=false` means the participant is going
   * back to fullscreen (Back): the exit is confirmed as accidental and the
   * caller may suppress its integrity recording. `accepted=true` means they
   * chose to continue windowed (Continue): record it.
   */
  resolveExit: (accepted: boolean) => void;
  /** True while a live session must be locked: active but not fullscreen. */
  requiredOpen: boolean;
  /** Unexpected (not ours) exits this session — integrity messaging. */
  exitCount: number;
}

export interface AssessmentFullscreenGateOptions {
  /**
   * Fired synchronously on each UNEXPECTED exit (Escape / F11 / OS gesture)
   * while the session is active. Callers cancel client narration here so no
   * TTS keeps playing into a locked screen. The underlying browser-API hook
   * suppresses it for the programmatic exits this hook performs.
   */
  onUnexpectedExit?: () => void;
}

/**
 * @param active True while a live proctored assessment exists (a running
 *   interview session, or a quiz attempt being taken).
 *   Everything resets when this goes false, so a retry in the same page
 *   session starts from zero exits and an idle request state.
 */
export function useAssessmentFullscreenGate(
  active: boolean,
  options: AssessmentFullscreenGateOptions = {},
): AssessmentFullscreenGate {
  // Held in a ref so a caller passing an inline closure does not re-attach the
  // underlying fullscreenchange listener on every render.
  const onUnexpectedExitRef = useRef(options.onUnexpectedExit);
  onUnexpectedExitRef.current = options.onUnexpectedExit;

  const [requestState, setRequestState] =
    useState<FullscreenRequestState>("idle");
  const [exitCount, setExitCount] = useState(0);
  // Set when fullscreen is lost unexpectedly, cleared by resolveExit, by the
  // browser re-entering fullscreen, or by the session ending. While set, the
  // exit's integrity recording is still deferrable.
  const [pendingExit, setPendingExit] = useState(false);

  const handleFullscreenLost = useCallback(() => {
    setExitCount((count) => count + 1);
    setPendingExit(true);
    // The browser revoked fullscreen on its own; the next request is a fresh
    // user gesture, so drop any stale granted/denied state.
    setRequestState("idle");
    onUnexpectedExitRef.current?.();
  }, []);

  const resolveExit = useCallback((accepted: boolean) => {
    setPendingExit(false);
    if (!accepted) {
      // Back = accidental exit, undone. Retract the exit we optimistically
      // counted so the recorded warning count stays honest.
      setExitCount((count) => Math.max(0, count - 1));
    }
  }, []);

  const fullscreen = useAssessmentFullscreen(active, {
    onUnexpectedExit: handleFullscreenLost,
  });

  // The policy's request-state bookkeeping around the shared browser layer.
  const enter = useCallback(async (): Promise<boolean> => {
    // Already granted (e.g. the user re-entered via a native browser gesture
    // like F11): a granted gate is granted — do not flash a request.
    if (currentFullscreenElement()) {
      setRequestState("granted");
      return true;
    }
    if (!fullscreen.supported) {
      setRequestState("unsupported");
      return false;
    }
    setRequestState("requesting");
    const granted = await fullscreen.enter();
    // Only the DOM verdict opens the gate; `enter()` already re-checked the
    // element after the promise resolved, so a resolved-but-not-fullscreen
    // request lands here as a denial and the gate screen stays up.
    setRequestState(granted ? "granted" : "denied");
    return granted;
  }, [fullscreen]);

  const exit = useCallback(
    (intentional = true) => fullscreen.exit(intentional),
    [fullscreen],
  );

  // Session ended (results, retry cleared the session, left the flow): reset
  // the policy so a NEW attempt starts clean, and drop any lingering state.
  useEffect(() => {
    if (active) return;
    setRequestState("idle");
    setExitCount(0);
  }, [active]);

  const isFullscreen = fullscreen.isFullscreen;
  const requiredOpen = active && !isFullscreen;

  // Self-clearing: the participant answered the browser's own re-entry
  // gesture (F11) or the session ended while the dialog was up.
  useEffect(() => {
    if (pendingExit && (isFullscreen || !active)) setPendingExit(false);
  }, [pendingExit, isFullscreen, active]);

  return {
    supported: fullscreen.supported,
    isFullscreen,
    isFullscreenNow: fullscreen.isFullscreenNow,
    requestState,
    enter,
    exit,
    pendingExit,
    resolveExit,
    requiredOpen,
    exitCount,
  };
}
