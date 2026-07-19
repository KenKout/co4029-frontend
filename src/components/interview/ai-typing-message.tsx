import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Renders an AI interview message with a typewriter effect and, on first
 * mount, speaks the text aloud via the browser speech synthesizer.
 *
 * Used by the interview chat UI so every AI turn (question or follow-up) is
 * simultaneously TYPED out on screen and SPOKEN — regardless of whether the
 * session is text- or voice-based. Purely client-side.
 *
 * Behaviour:
 *  - `animate=true` (a freshly-arrived turn): types character-by-character and
 *    triggers speech once. The typing runs a single time per mount; because the
 *    parent keys turns by stable id, re-renders never restart the animation.
 *  - `animate=false` (historical turns, or reduced-motion): shows the full text
 *    immediately and stays silent.
 */

const TYPING_INTERVAL_MS = 18;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface AiTypingMessageProps {
  text: string;
  /** Whether to animate + speak. False renders the full text silently. */
  animate: boolean;
  /** Speak callback (browser TTS). No-op when TTS is unsupported. */
  speak: (text: string) => void;
  /** Called on each typed chunk so the parent can keep the view scrolled. */
  onTick?: () => void;
  /** Reports whether the type-and-speak presentation is currently active. */
  onTypingChange?: (typing: boolean) => void;
  className?: string;
}

export function AiTypingMessage({
  text,
  animate,
  speak,
  onTick,
  onTypingChange,
  className,
}: AiTypingMessageProps) {
  const reduced = prefersReducedMotion();
  const shouldAnimate = animate && !reduced;
  const [shown, setShown] = useState(shouldAnimate ? "" : text);
  const [typing, setTyping] = useState(shouldAnimate);
  // Keep the latest onTick without restarting the typing effect.
  const onTickRef = useRef(onTick);
  const onTypingChangeRef = useRef(onTypingChange);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);
  useEffect(() => {
    onTypingChangeRef.current = onTypingChange;
  }, [onTypingChange]);

  // Type once per mount. Stable turn keys mean this never re-runs on the
  // parent's re-renders, so the animation doesn't restart mid-way.
  useEffect(() => {
    if (!shouldAnimate) {
      setShown(text);
      setTyping(false);
      onTypingChangeRef.current?.(false);
      return;
    }
    // Speak the whole utterance immediately, in parallel with the typing.
    onTypingChangeRef.current?.(true);
    speak(text);

    let index = 0;
    const chars = Array.from(text);
    const timer = window.setInterval(() => {
      index += 1;
      setShown(chars.slice(0, index).join(""));
      onTickRef.current?.();
      if (index >= chars.length) {
        window.clearInterval(timer);
        setTyping(false);
        onTypingChangeRef.current?.(false);
      }
    }, TYPING_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      onTypingChangeRef.current?.(false);
    };
    // Intentionally run once on mount; deps captured at first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <p className={cn("text-base leading-relaxed whitespace-pre-wrap", className)}>
      {shown}
      {typing && (
        <span
          aria-hidden="true"
          className="inline-block w-[2px] h-[1.1em] align-text-bottom bg-m3-primary ml-0.5 animate-pulse"
        />
      )}
    </p>
  );
}

export default AiTypingMessage;
