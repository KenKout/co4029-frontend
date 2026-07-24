import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { NarrationPresentation } from "@/lib/hooks/use-interview-narration";
import { cn } from "@/lib/utils";

const MIN_PREPARATION_MS = 600;
// Hold the "preparing" loading indicator until the voice ACTUALLY starts
// playing (presentation.started), so text and audio begin together instead of
// the text racing ahead while server TTS (Deepgram) is still fetching/decoding.
// This is a safety cap only: presentation.started resolves the moment audio (or
// the browser-voice fallback) begins, so in the normal case there is no extra
// wait. The cap must exceed the narration client timeout (20s, matching the
// worst-case Deepgram synth of long onboarding turns) so a slow/failed TTS
// still releases the typing; keep a small margin over that.
const MAX_NARRATION_READY_WAIT_MS = 22_000;
const MAX_DURATION_READY_WAIT_MS = 250;
const MAX_PLAYOUT_WAIT_MS = 30_000;
const TYPING_INTERVAL_MS = 44;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function typingDelayAfter(character: string): number {
  if (/[.!?]/.test(character)) return 180;
  if (/[,;:]/.test(character)) return 100;
  if (/\s/.test(character)) return 28;
  return TYPING_INTERVAL_MS;
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

type LegacyNarration = void | Promise<void>;

function normalizePresentation(
  result: LegacyNarration | NarrationPresentation,
): NarrationPresentation {
  if (
    result &&
    typeof result === "object" &&
    "started" in result &&
    "finished" in result
  ) {
    return result;
  }
  const promise = Promise.resolve(result).catch(() => undefined);
  return { started: promise, finished: promise };
}

export interface AiTypingMessageProps {
  text: string;
  animate: boolean;
  speak: (text: string) => LegacyNarration | NarrationPresentation;
  onTick?: () => void;
  onTypingChange?: (typing: boolean) => void;
  onTextComplete?: () => void;
  onPresentationComplete?: () => void;
  presentationKind?: "opening" | "question" | "closing";
  className?: string;
}

type PresentationPhase = "preparing" | "typing" | "complete";

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
    if (!animate) {
      setShown(text);
      setPhase("complete");
      callbacksRef.current.onTypingChange?.(false);
      callbacksRef.current.onTextComplete?.();
      return;
    }

    let cancelled = false;
    const timers = new Set<number>();
    const wait = (milliseconds: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          resolve();
        }, milliseconds);
        timers.add(timer);
      });

    setPhase("preparing");
    callbacksRef.current.onTypingChange?.(false);

    let presentation: NarrationPresentation;
    try {
      presentation = normalizePresentation(speak(text));
    } catch {
      presentation = {
        started: Promise.resolve(),
        finished: Promise.resolve(),
      };
    }

    const typeText = async () => {
      let narrationStartedAt: number | null = null;
      const narrationStarted = presentation.started
        .catch(() => undefined)
        .then(() => {
          narrationStartedAt = nowMs();
        });
      await Promise.all([
        wait(MIN_PREPARATION_MS),
        Promise.race([narrationStarted, wait(MAX_NARRATION_READY_WAIT_MS)]),
      ]);
      if (cancelled) return;

      callbacksRef.current.onTypingChange?.(true);
      if (!shouldType) {
        setShown(text);
        setPhase("complete");
        callbacksRef.current.onTick?.();
        callbacksRef.current.onTextComplete?.();
        return;
      }

      const characters = Array.from(text);
      if (characters.length === 0) {
        setPhase("complete");
        callbacksRef.current.onTextComplete?.();
        return;
      }
      const baseDelays = characters
        .slice(1)
        .map((_, index) => typingDelayAfter(characters[index]));
      let delays = baseDelays;
      if (presentation.durationMs) {
        const duration = await Promise.race([
          presentation.durationMs.catch(() => null),
          wait(MAX_DURATION_READY_WAIT_MS).then(() => null),
        ]);
        if (cancelled) return;
        if (duration !== null && Number.isFinite(duration) && duration > 0) {
          const elapsedSinceNarrationStart =
            narrationStartedAt === null
              ? 0
              : Math.max(0, nowMs() - narrationStartedAt);
          const remainingDuration = Math.max(
            0,
            duration - elapsedSinceNarrationStart,
          );
          const totalWeight = baseDelays.reduce(
            (total, delay) => total + delay,
            0,
          );
          delays = baseDelays.map((delay) =>
            Math.max(1, (remainingDuration * delay) / totalWeight),
          );
        }
      }
      setPhase("typing");
      setShown(characters[0]);
      callbacksRef.current.onTick?.();
      for (let index = 1; index < characters.length; index += 1) {
        if (cancelled) return;
        await wait(delays[index - 1]);
        if (cancelled) return;
        setShown(characters.slice(0, index + 1).join(""));
        callbacksRef.current.onTick?.();
      }
      if (!cancelled) {
        setPhase("complete");
        callbacksRef.current.onTextComplete?.();
      }
    };

    void (async () => {
      await Promise.all([
        typeText(),
        Promise.race([
          presentation.finished.catch(() => undefined),
          wait(MAX_PLAYOUT_WAIT_MS),
        ]),
      ]);
      if (cancelled) return;
      setShown(text);
      setPhase("complete");
      callbacksRef.current.onTypingChange?.(false);
      callbacksRef.current.onPresentationComplete?.();
    })();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      callbacksRef.current.onTypingChange?.(false);
    };
    // A turn is keyed by its parent, so its presentation intentionally runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preparationKey =
    presentationKind === "opening"
      ? "course_interview.workspace.preparing_greeting"
      : presentationKind === "closing"
        ? "course_interview.workspace.preparing_goodbye"
        : "course_interview.workspace.preparing_question";

  return (
    <p
      className={cn(
        "whitespace-pre-wrap text-base leading-relaxed text-justify hyphens-auto",
        className,
      )}
    >
      {phase === "preparing" ? (
        <span
          role="status"
          className="inline-flex items-center gap-2 text-sm font-medium text-text-muted"
        >
          <span className="inline-flex items-center gap-1" aria-hidden="true">
            <span className="size-1.5 rounded-full bg-primary/70 motion-safe:animate-bounce [animation-delay:-300ms]" />
            <span className="size-1.5 rounded-full bg-primary/70 motion-safe:animate-bounce [animation-delay:-150ms]" />
            <span className="size-1.5 rounded-full bg-primary/70 motion-safe:animate-bounce" />
          </span>
          {t(preparationKey)}
        </span>
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
