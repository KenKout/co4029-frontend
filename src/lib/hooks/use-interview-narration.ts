import { useCallback, useEffect, useRef } from "react";

import { apiPostBlob, ApiError } from "@/lib/api/client";
import { useSpeechSynthesis, type SpeechPersona } from "./use-speech-synthesis";

/**
 * Narration for text/hybrid interview sessions.
 *
 * Primary path: POST the AI utterance to the backend narration endpoint, which
 * synthesizes it with the SAME OpenAI-compatible TTS the LiveKit voice agent
 * uses (agent-quality voice, persona-mapped server-side), and play the returned
 * MP3 via an `<audio>` element. This gives text/hybrid the good voice WITHOUT
 * mounting a realtime LiveKit room (which would race the REST loop for control
 * of the session).
 *
 * Fallback path: if the server TTS is unavailable (503, network error, missing
 * credentials), fall back to the browser's local `speechSynthesis` so narration
 * still happens — just with the robotic system voice.
 *
 * The caller supplies persona + lang so both paths stay consistent.
 */

export interface UseInterviewNarration {
  /** Speak an AI utterance (server TTS, browser-TTS fallback). No-op if muted upstream. */
  narrate: (text: string) => void;
  /** Stop any in-flight audio and browser speech immediately. */
  cancel: () => void;
}

export function useInterviewNarration(params: {
  sessionId: string | null;
  persona: SpeechPersona;
  lang: string;
}): UseInterviewNarration {
  const { sessionId, persona, lang } = params;
  const browser = useSpeechSynthesis();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  // Monotonic token so a slow fetch that resolves after a newer narrate() (or
  // after cancel) is discarded instead of playing stale audio over the top.
  const tokenRef = useRef(0);

  const releaseUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    tokenRef.current += 1;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        // ignore
      }
      audioRef.current = null;
    }
    releaseUrl();
    browser.cancel();
  }, [browser, releaseUrl]);

  const narrate = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      // Invalidate any prior playback and claim this turn.
      cancel();
      const myToken = tokenRef.current;

      if (!sessionId) {
        // No session yet — best-effort browser fallback.
        browser.speak(clean, { lang, persona });
        return;
      }

      void (async () => {
        try {
          const blob = await apiPostBlob(
            `/interview-sessions/${sessionId}/narration`,
            { text: clean },
          );
          // A newer narrate()/cancel() happened while we were fetching.
          if (myToken !== tokenRef.current) return;

          const url = URL.createObjectURL(blob);
          objectUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            if (myToken === tokenRef.current) releaseUrl();
          };
          audio.onerror = () => {
            // Playback failed — fall back to browser TTS.
            if (myToken === tokenRef.current) {
              releaseUrl();
              browser.speak(clean, { lang, persona });
            }
          };
          await audio.play();
        } catch (err) {
          if (myToken !== tokenRef.current) return;
          // 503 = server TTS unavailable; anything else = network/etc.
          // Either way, fall back to the browser synthesizer so the student
          // still hears the question.
          if (!(err instanceof ApiError) || err.status >= 500) {
            browser.speak(clean, { lang, persona });
          } else {
            // 4xx (e.g. auth) — stay silent rather than spam; log for debug.
            // eslint-disable-next-line no-console
            console.warn("narration request failed", err.status);
          }
        }
      })();
    },
    [sessionId, persona, lang, browser, cancel, releaseUrl],
  );

  // Stop audio if the component using this unmounts (navigation away).
  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  return { narrate, cancel };
}
