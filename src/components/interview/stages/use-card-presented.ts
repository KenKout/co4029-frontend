import { useEffect, useRef } from "react";

/**
 * Report a question card as presented, once, on mount.
 *
 * The card's lifecycle callbacks are what unlock the composer and reveal the
 * action buttons, and `AiTypingMessage` fires them when its typewriter finishes.
 * The static path has no typewriter, so it must fire them itself or the
 * candidate is left with a readable question and a locked composer.
 */
export function useCardPresented(
  onSpeakingChange: (speaking: boolean) => void,
  onPresentationComplete: () => void,
): void {
  const reported = useRef(false);
  useEffect(() => {
    onSpeakingChange(false);
    if (reported.current) return;
    reported.current = true;
    onPresentationComplete();
  }, [onSpeakingChange, onPresentationComplete]);
}
