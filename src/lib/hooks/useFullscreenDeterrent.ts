/**
 * Fullscreen proctoring deterrent: when to ask the candidate to go fullscreen,
 * and what to show when they leave it mid-interview.
 *
 * Split out of `routes/course-interview.tsx` (step 2 of that file's
 * decomposition), and shared with the quiz take since both are proctored the
 * same way. This sits ON TOP of `useAssessmentFullscreen`, which owns the
 * browser API; everything here is the *policy* around it — ask once per
 * session, count unexpected exits, reset when the session ends.
 *
 * Kept as one hook because the three flags are meaningless apart: an exit count
 * with no warning dialog deters nobody, and a prompt that re-fires on every
 * render of an active phase is worse than not prompting.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useAssessmentFullscreen } from "@/lib/hooks/useAssessmentFullscreen";

export interface FullscreenDeterrent {
  /** Show the initial "go fullscreen?" consent dialog. */
  promptOpen: boolean;
  /** Show the "you left fullscreen" warning. */
  warningOpen: boolean;
  /** How many unexpected exits have been recorded this session. */
  exitCount: number;
  /** Enter fullscreen (a user gesture is required, so call from a handler).
   *  Resolves false when the request is refused or unsupported. */
  enter: () => Promise<boolean>;
  /** Dismiss the consent dialog without entering. */
  declinePrompt: () => void;
  /** Accept the consent dialog: closes it and enters fullscreen. */
  acceptPrompt: () => void;
  /** Dismiss the exit warning, staying windowed. */
  dismissWarning: () => void;
  /** Close the warning and go back to fullscreen. */
  reenter: () => void;
}

export interface FullscreenDeterrentOptions {
  /**
   * Called for each UNEXPECTED exit (Escape / F11 / OS gesture) — never for
   * the programmatic exit this hook performs when the take ends. Callers that
   * record proctoring events pass their recorder here; the interview instead
   * logs from its own reporter's `fullscreenchange` listener, which is why
   * this is optional.
   */
  onUnexpectedExit?: () => void;
}

/**
 * @param active True while a take is live (an assessed interview phase, or a
 *   quiz attempt in progress). Everything resets to its initial state when
 *   this goes false, so a second attempt in the same page session prompts
 *   again and starts from zero exits.
 */
export function useFullscreenDeterrent(
  active: boolean,
  options: FullscreenDeterrentOptions = {},
): FullscreenDeterrent {
  // Held in a ref so a caller passing an inline closure does not re-attach the
  // underlying fullscreenchange listener on every render.
  const onUnexpectedExitRef = useRef(options.onUnexpectedExit);
  onUnexpectedExitRef.current = options.onUnexpectedExit;
  const [promptOpen, setPromptOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [exitCount, setExitCount] = useState(0);
  // Once the candidate explicitly chooses to stay windowed we stop re-asking,
  // otherwise the prompt would reappear on every render pass of an active phase.
  const promptedRef = useRef(false);

  const handleFullscreenLost = useCallback(() => {
    setExitCount((count) => count + 1);
    setWarningOpen(true);
    onUnexpectedExitRef.current?.();
  }, []);

  const fullscreen = useAssessmentFullscreen(active, {
    onUnexpectedExit: handleFullscreenLost,
  });

  // Ask once, as soon as a session goes live.
  useEffect(() => {
    if (!active) {
      promptedRef.current = false;
      setPromptOpen(false);
      setWarningOpen(false);
      setExitCount(0);
      return;
    }
    if (promptedRef.current) return;
    if (!fullscreen.supported || fullscreen.isFullscreen) {
      promptedRef.current = true;
      return;
    }
    promptedRef.current = true;
    setPromptOpen(true);
  }, [active, fullscreen.supported, fullscreen.isFullscreen]);

  const acceptPrompt = useCallback(() => {
    setPromptOpen(false);
    void fullscreen.enter();
  }, [fullscreen]);

  const reenter = useCallback(() => {
    setWarningOpen(false);
    void fullscreen.enter();
  }, [fullscreen]);

  const declinePrompt = useCallback(() => setPromptOpen(false), []);
  const dismissWarning = useCallback(() => setWarningOpen(false), []);

  return {
    promptOpen,
    warningOpen,
    exitCount,
    enter: fullscreen.enter,
    declinePrompt,
    acceptPrompt,
    dismissWarning,
    reenter,
  };
}
