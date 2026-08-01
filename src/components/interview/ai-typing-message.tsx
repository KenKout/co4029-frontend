import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  PREPARATION_KEYS,
  PreparationIndicator,
  type PresentationKind,
} from "@/components/interview/ai-typing-message/preparation-indicator";
import { runPresentation } from "@/components/interview/ai-typing-message/presentation-runner";
import {
  prefersReducedMotion,
  type PresentationPhase,
  type Speak,
} from "@/components/interview/ai-typing-message/narration";
import { cn } from "@/lib/utils";

export interface AiTypingMessageProps {
  text: string;
  animate: boolean;
  speak: Speak;
  onTick?: () => void;
  onTypingChange?: (typing: boolean) => void;
  onTextComplete?: () => void;
  onPresentationComplete?: () => void;
  presentationKind?: PresentationKind;
  className?: string;
}

export function AiTypingMessage({
  text,
  animate,
  speak,
  onTick,
  onTypingChange,
  onTextComplete,
  onPresentationComplete,
  presentationKind = "question",
  className,
}: AiTypingMessageProps) {
  const { t } = useTranslation();
  const reduced = prefersReducedMotion();
  const shouldType = animate && !reduced;
  const [shown, setShown] = useState(shouldType ? "" : text);
  const [phase, setPhase] = useState<PresentationPhase>(
    animate ? "preparing" : "complete",
  );
  const callbacksRef = useRef({
    onTick,
    onTypingChange,
    onTextComplete,
    onPresentationComplete,
  });

  useEffect(() => {
    callbacksRef.current = {
      onTick,
      onTypingChange,
      onTextComplete,
      onPresentationComplete,
    };
  }, [onTick, onTypingChange, onTextComplete, onPresentationComplete]);

  useEffect(() => {
    return runPresentation({
      animate,
      shouldType,
      text,
      speak,
      callbacks: () => callbacksRef.current,
      setShown,
      setPhase,
    });
    // A turn is keyed by its parent, so its presentation intentionally runs once.
  }, []);

  return (
    <p
      className={cn(
        "whitespace-pre-wrap text-base leading-relaxed text-justify hyphens-auto",
        className,
      )}
    >
      {phase === "preparing" ? (
        <PreparationIndicator label={t(PREPARATION_KEYS[presentationKind])} />
      ) : (
        shown
      )}
      {phase === "typing" && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[1.1em] w-[2px] animate-pulse bg-m3-primary align-text-bottom"
        />
      )}
    </p>
  );
}

export default AiTypingMessage;
