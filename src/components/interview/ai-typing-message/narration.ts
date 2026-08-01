import type { NarrationPresentation } from "@/lib/hooks/use-interview-narration";

export const MIN_PREPARATION_MS = 600;
// Hold the "preparing" loading indicator until the voice ACTUALLY starts
// playing (presentation.started), so text and audio begin together instead of
// the text racing ahead while server TTS (Deepgram) is still fetching/decoding.
// This is a safety cap only: presentation.started resolves the moment audio (or
// the browser-voice fallback) begins, so in the normal case there is no extra
// wait. The cap must exceed the narration client timeout (20s, matching the
// worst-case Deepgram synth of long onboarding turns) so a slow/failed TTS
// still releases the typing; keep a small margin over that.
export const MAX_NARRATION_READY_WAIT_MS = 22_000;
export const MAX_DURATION_READY_WAIT_MS = 250;
export const MAX_PLAYOUT_WAIT_MS = 30_000;
const TYPING_INTERVAL_MS = 44;

export type PresentationPhase = "preparing" | "typing" | "complete";

export type LegacyNarration = void | Promise<void>;

export type Speak = (text: string) => LegacyNarration | NarrationPresentation;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function typingDelayAfter(character: string): number {
  if (/[.!?]/.test(character)) return 180;
  if (/[,;:]/.test(character)) return 100;
  if (/\s/.test(character)) return 28;
  return TYPING_INTERVAL_MS;
}

export function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function normalizePresentation(
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
