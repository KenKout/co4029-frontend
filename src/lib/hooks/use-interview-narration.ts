import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  resolvePersonaTraits,
  type PersonaTraits,
} from "@/lib/interview/persona-traits";
import {
  narrationDebugEnabled,
  type ActiveAudioGraph,
} from "@/lib/hooks/use-interview-narration/audio-support";
import {
  abortNarration,
  releaseObjectUrl,
  startWarmupLoop,
  stopWarmupLoop,
} from "@/lib/hooks/use-interview-narration/audio-lifecycle";
import { createBrowserFallback } from "@/lib/hooks/use-interview-narration/browser-fallback";
import { createNarrationDeferred } from "@/lib/hooks/use-interview-narration/presentation";
import { runServerNarration } from "@/lib/hooks/use-interview-narration/server-narration";
import { createWarmupWindow } from "@/lib/hooks/use-interview-narration/warmup-window";
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

// Words-per-minute is DERIVED from the verbosity trait (see
// lib/interview/persona-traits.wordsPerMinuteFromTraits), not a per-name table,
// so a fourth persona or a teacher's per-trait override needs no edit here.
//
// The audio plumbing this hook orchestrates lives in
// `./use-interview-narration/`: timing constants, the keep-alive WAV and
// readiness wait, the presentation promises, the warm-up window, the ref-level
// lifecycle, and the three playout paths (Web Audio, buffered HTMLAudio,
// browser voice).

export function useInterviewNarration(params: {
  sessionId: string | null;
  persona: SpeechPersona;
  lang: string;
  /**
   * When false, skip the server ``/narration`` call entirely and go straight
   * to the browser's local speech synthesizer. Used for Vietnamese sessions:
   * Deepgram Aura TTS is English-only and the OpenAI-compatible gateway serves
   * no TTS model on this deployment, so the server would always 503 for VI —
   * calling it just spams the console with failed requests before the same
   * browser-voice fallback kicks in. Gated by the SESSION language (not the UI
   * locale) so an English session viewed with a VI UI still uses server TTS.
   */
  serverNarrationEnabled?: boolean;
  /**
   * Resolved persona traits (preset merged with any teacher per-trait
   * override). When present, these drive the browser-voice WPM estimate; else
   * the ``persona`` label's preset traits are used. TONE ONLY.
   */
  traits?: PersonaTraits;
}): UseInterviewNarration {
  const {
    sessionId,
    persona,
    lang,
    serverNarrationEnabled = true,
    traits,
  } = params;
  // Resolve once: explicit override traits win, else the persona preset.
  // Memoised so the narrate callback's identity is stable across renders.
  const resolvedTraits = useMemo(
    () => traits ?? resolvePersonaTraits(persona),
    [traits, persona],
  );
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

  const releaseUrl = useCallback(() => releaseObjectUrl(objectUrlRef), []);

  const stopAudioWarmup = useCallback(
    () => stopWarmupLoop({ warmupAudioRef, warmupUrlRef }),
    [],
  );

  const startAudioWarmup = useCallback((): number | null => {
    stopAudioWarmup();
    return startWarmupLoop({ warmupAudioRef, warmupUrlRef, stopAudioWarmup });
  }, [stopAudioWarmup]);

  const cancel = useCallback(() => {
    abortNarration({
      tokenRef,
      audioRef,
      audioGraphRef,
      settleActiveRef,
      stopAudioWarmup,
      releaseUrl,
      browserCancel,
    });
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
      if (narrationDebugEnabled()) {
        console.debug(
          `[narration] narrate — token ${myToken}: "${clean.slice(0, 48)}${clean.length > 48 ? "…" : ""}"`,
        );
      }
      const isCurrent = () => myToken === tokenRef.current;
      const warmupStartedAt = startAudioWarmup();
      const warmup = createWarmupWindow({
        warmupStartedAt,
        isCurrent,
        stopAudioWarmup,
      });
      const deferred = createNarrationDeferred();

      settleActiveRef.current = deferred.settleAll;

      const browserFallback = createBrowserFallback({
        clean,
        lang,
        persona,
        traits: resolvedTraits,
        browserSpeak,
        deferred,
        warmup,
        isCurrent,
        stopAudioWarmup,
      });

      void runServerNarration({
        clean,
        sessionId,
        serverNarrationEnabled,
        deferred,
        warmup,
        isCurrent,
        stopAudioWarmup,
        releaseUrl,
        browserFallback,
        audioRef,
        objectUrlRef,
        audioGraphRef,
      });

      return {
        started: deferred.started,
        finished: deferred.finished,
        durationMs: deferred.durationMs,
      };
    },
    [
      sessionId,
      persona,
      resolvedTraits,
      lang,
      serverNarrationEnabled,
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
