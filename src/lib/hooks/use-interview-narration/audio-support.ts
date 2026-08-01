/**
 * Audio plumbing shared by the narration playout paths: the keep-alive WAV, the
 * duration estimate for the browser voice, the buffered-audio readiness wait,
 * and the vendor-prefixed AudioContext lookup.
 *
 * Moved verbatim out of `use-interview-narration.ts`. Every timeout, event
 * ordering and cleanup path is unchanged.
 */

import {
  wordsPerMinuteFromTraits,
  type PersonaTraits,
} from "@/lib/interview/persona-traits";
import {
  AUDIO_KEEPALIVE_INT16,
  AUDIO_READY_TIMEOUT_MS,
  AUDIO_WARMUP_DURATION_MS,
  AUDIO_WARMUP_SAMPLE_RATE,
  HAVE_FUTURE_DATA,
} from "@/lib/hooks/use-interview-narration/constants";

/** Thrown when the server narration request outlives its client-side cap. */
export class NarrationTimeoutError extends Error {}

export interface ActiveAudioGraph {
  context: AudioContext;
  source: AudioBufferSourceNode;
}

/** Mutable ref shape, structurally compatible with React's `useRef` result. */
export interface MutableRef<T> {
  current: T;
}

export function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// TEMP DIAG (narration skip B): gated on localStorage so it can be toggled in
// the deployed production build. Remove with the console.debug calls once the
// skip root cause is confirmed.
export function narrationDebugEnabled(): boolean {
  try {
    return (
      typeof localStorage !== "undefined" &&
      localStorage.getItem("narrationDebug") === "1"
    );
  } catch {
    return false;
  }
}

/** Write the 44-byte RIFF/WAVE header for a mono 16-bit PCM stream. */
function writeWavHeader(view: DataView, dataLength: number): void {
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, AUDIO_WARMUP_SAMPLE_RATE, true);
  view.setUint32(28, AUDIO_WARMUP_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, dataLength, true);
}

/** Build a tiny near-silent WAV that opens and keeps the audio output route warm. */
export function createAudioWarmupBlob(): Blob {
  const sampleCount = Math.ceil(
    (AUDIO_WARMUP_SAMPLE_RATE * AUDIO_WARMUP_DURATION_MS) / 1_000,
  );
  const dataLength = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeWavHeader(view, dataLength);
  for (let index = 0; index < sampleCount; index += 1) {
    // Alternating full-Nyquist tone at the keep-alive amplitude: inaudible
    // (the speaker can't reproduce a 24 kHz tone and the ear can't hear it) but
    // loud enough in the digital domain to stop a power-managed DAC / Bluetooth
    // route from auto-muting and clipping the first syllable of real speech.
    view.setInt16(
      44 + index * 2,
      index % 2 === 0 ? AUDIO_KEEPALIVE_INT16 : -AUDIO_KEEPALIVE_INT16,
      true,
    );
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function estimateSpeechDurationMs(
  text: string,
  traits: PersonaTraits,
  lang: string,
): number {
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  const punctuationPauses = (text.match(/[.!?;:]/gu) ?? []).length * 180;
  const languageRate = lang.toLowerCase().startsWith("vi") ? 0.92 : 1;
  const wordsPerMinute = wordsPerMinuteFromTraits(traits) * languageRate;
  return Math.max(800, (words * 60_000) / wordsPerMinute + punctuationPauses);
}

export function waitForAudioReady(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      audio.removeEventListener("canplaythrough", finish);
      audio.removeEventListener("error", finish);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      resolve();
    };

    audio.addEventListener("canplaythrough", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    // TDZ-safe: `finish` closes over `timeoutId` but its earliest possible
    // caller is the readyState shortcut below, and neither addEventListener
    // dispatches synchronously. The `| undefined` keeps `finish`'s guard typed.
    const timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(
      finish,
      AUDIO_READY_TIMEOUT_MS,
    );
    audio.load();
    if (audio.readyState >= HAVE_FUTURE_DATA) finish();
  });
}

export function audioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };
  return window.AudioContext ?? browserWindow.webkitAudioContext ?? null;
}
