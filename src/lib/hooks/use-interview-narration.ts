import { useCallback, useEffect, useMemo, useRef } from "react";

import { apiPostBlob, ApiError } from "@/lib/api/client";
import { useSpeechSynthesis, type SpeechPersona } from "./use-speech-synthesis";

/** Separate readiness and playout signals used to coordinate voice and text. */
export interface NarrationPresentation {
  started: Promise<void>;
  finished: Promise<void>;
  /** Actual media duration when available, otherwise a conservative estimate. */
  durationMs?: Promise<number | null>;
}

export interface UseInterviewNarration {
  narrate: (text: string) => NarrationPresentation;
  cancel: () => void;
}

const SERVER_NARRATION_TIMEOUT_MS = 6_000;
const AUDIO_READY_TIMEOUT_MS = 1_500;
const AUDIO_OUTPUT_WARMUP_MS = 400;
// Keep the warm-up loop running well into the real audio so the physical
// output route can't re-idle and clip the first syllable during the handoff.
const AUDIO_OUTPUT_HANDOFF_OVERLAP_MS = 320;
const AUDIO_WARMUP_DURATION_MS = 500;
// 48 kHz so the alternating-sample keep-alive tone sits at 24 kHz (Nyquist),
// which is inaudible — letting us raise its amplitude enough to hold the
// output route open without the user ever hearing it.
const AUDIO_WARMUP_SAMPLE_RATE = 48_000;
const EMBEDDED_AUDIO_LEAD_IN_MS = 500;
const AUDIO_SOURCE_SCHEDULE_AHEAD_MS = 30;
// Keep-alive amplitude for the near-silent warm-up tone and the embedded
// lead-in. Both signals alternate every sample (a Nyquist-frequency tone the
// speaker can't reproduce and the ear can't hear), so this can be far above
// the old ~-84 dBFS noise floor. At ~-56 dBFS it reliably defeats the
// auto-mute / squelch on power-managed laptop DACs and Bluetooth routes that
// treated the previous ±2/32768 signal as digital silence and let the output
// idle — which was clipping/attenuating the first syllable of each utterance.
const AUDIO_KEEPALIVE_INT16 = 48;
const AUDIO_LEAD_IN_AMPLITUDE = AUDIO_KEEPALIVE_INT16 / 32_768;
const HAVE_FUTURE_DATA = 3;
const PERSONA_WORDS_PER_MINUTE: Record<SpeechPersona, number> = {
  strict: 135,
  neutral: 155,
  supportive: 160,
};

class NarrationTimeoutError extends Error {}

interface ActiveAudioGraph {
  context: AudioContext;
  source: AudioBufferSourceNode;
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Build a tiny near-silent WAV that opens and keeps the audio output route warm. */
function createAudioWarmupBlob(): Blob {
  const sampleCount = Math.ceil(
    (AUDIO_WARMUP_SAMPLE_RATE * AUDIO_WARMUP_DURATION_MS) / 1_000,
  );
  const dataLength = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
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

function estimateSpeechDurationMs(
  text: string,
  persona: SpeechPersona,
  lang: string,
): number {
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  const punctuationPauses = (text.match(/[.!?;:]/gu) ?? []).length * 180;
  const languageRate = lang.toLowerCase().startsWith("vi") ? 0.92 : 1;
  const wordsPerMinute = PERSONA_WORDS_PER_MINUTE[persona] * languageRate;
  return Math.max(800, (words * 60_000) / wordsPerMinute + punctuationPauses);
}

function waitForAudioReady(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      audio.removeEventListener("canplaythrough", finish);
      audio.removeEventListener("error", finish);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      resolve();
    };

    audio.addEventListener("canplaythrough", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    timeoutId = setTimeout(finish, AUDIO_READY_TIMEOUT_MS);
    audio.load();
    if (audio.readyState >= HAVE_FUTURE_DATA) finish();
  });
}

function audioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };
  return window.AudioContext ?? browserWindow.webkitAudioContext ?? null;
}

export function useInterviewNarration(params: {
  sessionId: string | null;
  persona: SpeechPersona;
  lang: string;
}): UseInterviewNarration {
  const { sessionId, persona, lang } = params;
  const browser = useSpeechSynthesis();
  const browserSpeak = browser.speak;
  const browserCancel = browser.cancel;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const warmupAudioRef = useRef<HTMLAudioElement | null>(null);
  const warmupUrlRef = useRef<string | null>(null);
  const audioGraphRef = useRef<ActiveAudioGraph | null>(null);
  const tokenRef = useRef(0);
  const settleActiveRef = useRef<(() => void) | null>(null);

  const releaseUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stopAudioWarmup = useCallback(() => {
    if (warmupAudioRef.current) {
      try {
        warmupAudioRef.current.pause();
      } catch {
        // Audio warm-up cleanup is best-effort.
      }
      warmupAudioRef.current = null;
    }
    if (warmupUrlRef.current) {
      URL.revokeObjectURL(warmupUrlRef.current);
      warmupUrlRef.current = null;
    }
  }, []);

  const startAudioWarmup = useCallback((): number | null => {
    stopAudioWarmup();
    try {
      const url = URL.createObjectURL(createAudioWarmupBlob());
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.loop = true;
      warmupUrlRef.current = url;
      warmupAudioRef.current = audio;
      const startedAt = nowMs();
      void audio.play().catch(() => undefined);
      return startedAt;
    } catch {
      stopAudioWarmup();
      return null;
    }
  }, [stopAudioWarmup]);

  const cancel = useCallback(() => {
    tokenRef.current += 1;
    stopAudioWarmup();
    if (audioGraphRef.current) {
      const { context, source } = audioGraphRef.current;
      audioGraphRef.current = null;
      try {
        source.stop();
      } catch {
        // The source may already have ended.
      }
      void context.close().catch(() => undefined);
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        // Playback cancellation is best-effort.
      }
      audioRef.current = null;
    }
    releaseUrl();
    browserCancel();
    settleActiveRef.current?.();
    settleActiveRef.current = null;
  }, [browserCancel, releaseUrl, stopAudioWarmup]);

  const narrate = useCallback(
    (text: string): NarrationPresentation => {
      const clean = text.trim();
      if (!clean) {
        return {
          started: Promise.resolve(),
          finished: Promise.resolve(),
          durationMs: Promise.resolve(0),
        };
      }

      cancel();
      const myToken = tokenRef.current;
      const warmupStartedAt = startAudioWarmup();
      const ensureAudioWarmup = async () => {
        if (warmupStartedAt !== null) {
          const remaining =
            AUDIO_OUTPUT_WARMUP_MS - (nowMs() - warmupStartedAt);
          if (remaining > 0) {
            await new Promise<void>((resolve) => {
              window.setTimeout(resolve, remaining);
            });
          }
        }
      };
      const finishAudioWarmupAfterHandoff = () => {
        window.setTimeout(() => {
          if (myToken === tokenRef.current) stopAudioWarmup();
        }, AUDIO_OUTPUT_HANDOFF_OVERLAP_MS);
      };
      let startedSettled = false;
      let finishedSettled = false;
      let durationSettled = false;
      let fallbackStarted = false;
      let resolveStarted!: () => void;
      let resolveFinished!: () => void;
      let resolveDuration!: (durationMs: number | null) => void;
      const started = new Promise<void>((resolve) => {
        resolveStarted = () => {
          if (!startedSettled) {
            startedSettled = true;
            resolve();
          }
        };
      });
      const finished = new Promise<void>((resolve) => {
        resolveFinished = () => {
          if (!finishedSettled) {
            finishedSettled = true;
            resolve();
          }
        };
      });
      const durationMs = new Promise<number | null>((resolve) => {
        resolveDuration = (duration) => {
          if (!durationSettled) {
            durationSettled = true;
            resolve(duration);
          }
        };
      });

      settleActiveRef.current = () => {
        resolveStarted();
        resolveFinished();
        resolveDuration(null);
      };

      const browserFallback = () => {
        if (fallbackStarted) return;
        fallbackStarted = true;
        resolveDuration(estimateSpeechDurationMs(clean, persona, lang));
        void (async () => {
          await ensureAudioWarmup();
          if (myToken !== tokenRef.current) return;
          let browserSpeechStarted = false;
          const handleBrowserSpeechStart = () => {
            if (browserSpeechStarted || myToken !== tokenRef.current) return;
            browserSpeechStarted = true;
            resolveStarted();
            finishAudioWarmupAfterHandoff();
          };
          try {
            const speech = browserSpeak(clean, {
              lang,
              persona,
              onStart: handleBrowserSpeechStart,
            });
            await Promise.resolve(speech);
          } catch {
            // Browser speech is best-effort.
          } finally {
            // Some older engines omit onstart; never leave presentation stuck.
            handleBrowserSpeechStart();
            if (myToken === tokenRef.current) stopAudioWarmup();
            resolveFinished();
          }
        })();
      };

      void (async () => {
        if (!sessionId) {
          browserFallback();
          return;
        }

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        try {
          const blob = await Promise.race([
            apiPostBlob(`/interview-sessions/${sessionId}/narration`, {
              text: clean,
            }),
            new Promise<Blob>((_, reject) => {
              timeoutId = setTimeout(
                () => reject(new NarrationTimeoutError()),
                SERVER_NARRATION_TIMEOUT_MS,
              );
            }),
          ]);
          if (myToken !== tokenRef.current) return;

          const AudioContextClass = audioContextConstructor();
          if (AudioContextClass) {
            let context: AudioContext | null = null;
            try {
              context = new AudioContextClass();
              const encodedAudio = await blob.arrayBuffer();
              const decodedAudio = await context.decodeAudioData(
                encodedAudio.slice(0),
              );
              if (myToken !== tokenRef.current) {
                void context.close().catch(() => undefined);
                return;
              }

              const leadInFrames = Math.ceil(
                (decodedAudio.sampleRate * EMBEDDED_AUDIO_LEAD_IN_MS) / 1_000,
              );
              const protectedAudio = context.createBuffer(
                decodedAudio.numberOfChannels,
                leadInFrames + decodedAudio.length,
                decodedAudio.sampleRate,
              );
              for (
                let channel = 0;
                channel < decodedAudio.numberOfChannels;
                channel += 1
              ) {
                const destination = protectedAudio.getChannelData(channel);
                for (let frame = 0; frame < leadInFrames; frame += 1) {
                  // Near-silence keeps the physical output route active without
                  // adding a spoken word or changing the approved utterance.
                  destination[frame] =
                    frame % 2 === 0
                      ? AUDIO_LEAD_IN_AMPLITUDE
                      : -AUDIO_LEAD_IN_AMPLITUDE;
                }
                destination.set(
                  decodedAudio.getChannelData(channel),
                  leadInFrames,
                );
              }

              const source = context.createBufferSource();
              source.buffer = protectedAudio;
              source.connect(context.destination);
              audioGraphRef.current = { context, source };
              resolveDuration(decodedAudio.duration * 1_000);
              source.onended = () => {
                if (audioGraphRef.current?.source === source) {
                  audioGraphRef.current = null;
                }
                void context?.close().catch(() => undefined);
                if (myToken !== tokenRef.current) return;
                stopAudioWarmup();
                resolveStarted();
                resolveFinished();
              };

              await ensureAudioWarmup();
              if (myToken !== tokenRef.current) return;
              await context.resume();
              if (myToken !== tokenRef.current) return;
              source.start(
                context.currentTime + AUDIO_SOURCE_SCHEDULE_AHEAD_MS / 1_000,
              );
              finishAudioWarmupAfterHandoff();
              window.setTimeout(() => {
                if (myToken === tokenRef.current) resolveStarted();
              }, EMBEDDED_AUDIO_LEAD_IN_MS + AUDIO_SOURCE_SCHEDULE_AHEAD_MS);
              return;
            } catch {
              if (context) void context.close().catch(() => undefined);
              if (audioGraphRef.current?.context === context) {
                audioGraphRef.current = null;
              }
              // Older browsers can fail to decode an otherwise playable MP3;
              // retain the buffered HTMLAudio path as a compatibility fallback.
            }
          }

          const url = URL.createObjectURL(blob);
          objectUrlRef.current = url;
          const audio = new Audio(url);
          audio.preload = "auto";
          audioRef.current = audio;
          let serverAudioFailed = false;
          audio.onended = () => {
            if (myToken !== tokenRef.current) return;
            releaseUrl();
            resolveFinished();
          };
          audio.onerror = () => {
            if (myToken !== tokenRef.current) return;
            serverAudioFailed = true;
            releaseUrl();
            browserFallback();
          };
          await waitForAudioReady(audio);
          if (myToken !== tokenRef.current || serverAudioFailed) return;
          resolveDuration(
            Number.isFinite(audio.duration) && audio.duration > 0
              ? audio.duration * 1_000
              : null,
          );
          await ensureAudioWarmup();
          if (myToken !== tokenRef.current || serverAudioFailed) return;
          audio.currentTime = 0;
          await audio.play();
          resolveStarted();
          finishAudioWarmupAfterHandoff();
        } catch (error) {
          if (myToken !== tokenRef.current) return;
          if (
            error instanceof NarrationTimeoutError ||
            !(error instanceof ApiError) ||
            error.status >= 500
          ) {
            browserFallback();
          } else {
            // Authentication/validation failures should stay silent.
            // eslint-disable-next-line no-console
            console.warn("narration request failed", error.status);
            stopAudioWarmup();
            resolveStarted();
            resolveFinished();
            resolveDuration(null);
          }
        } finally {
          if (timeoutId !== undefined) clearTimeout(timeoutId);
        }
      })();

      return { started, finished, durationMs };
    },
    [
      sessionId,
      persona,
      lang,
      browserSpeak,
      cancel,
      releaseUrl,
      startAudioWarmup,
      stopAudioWarmup,
    ],
  );

  useEffect(() => () => cancel(), [cancel]);

  return useMemo(() => ({ narrate, cancel }), [narrate, cancel]);
}
