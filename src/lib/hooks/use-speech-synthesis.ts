import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Browser text-to-speech via the Web Speech API (`window.speechSynthesis`).
 *
 * Used in the interview chat UI so the AI "speaks" each question aloud while
 * the text types out on screen (see `AiTypingMessage`). Purely client-side —
 * no server, no LiveKit. This is distinct from the server-side LiveKit voice
 * agent, which drives full spoken-answer sessions.
 *
 * Not every browser exposes speech synthesis; callers should tolerate
 * `supported === false` (the feature simply becomes silent).
 */

import {
  prosodyFromTraits,
  resolvePersonaTraits,
  type PersonaTraits,
} from "@/lib/interview/persona-traits";

/** Interview AI persona — drives the spoken tone (rate + pitch). */
export type SpeechPersona = "strict" | "neutral" | "supportive";

/**
 * Persona prosody (rate + pitch + voice hints) is DERIVED from the 0-4 trait
 * dials (see lib/interview/persona-traits), not a per-name table. Browser TTS
 * only exposes rate + pitch (0–2, with ~0.1 steps audibly distinct), so persona
 * is expressed through pacing and pitch rather than a distinct trained voice.
 * A caller may pass explicit ``traits`` (e.g. a teacher's per-trait override);
 * otherwise the ``persona`` label resolves to its preset traits.
 */
export interface SpeakOptions {
  lang?: string;
  persona?: SpeechPersona;
  /** Resolved persona traits; when present these win over ``persona``. */
  traits?: PersonaTraits;
  /** Called when the browser reports that audible playout has actually begun. */
  onStart?: () => void;
}

export interface UseSpeechSynthesis {
  /** Whether the browser exposes speechSynthesis. */
  supported: boolean;
  /** Speak text after the narration coordinator has cancelled stale speech. */
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  /** Immediately stop any speech. */
  cancel: () => void;
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

export function useSpeechSynthesis(): UseSpeechSynthesis {
  const [supported] = useState(isSupported);
  // Installed voices load asynchronously; cache them and refresh on the
  // voiceschanged event so persona voice-matching has candidates to pick from.
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!supported) return;
    const load = () => {
      try {
        voicesRef.current = window.speechSynthesis.getVoices();
      } catch {
        // ignore
      }
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", load);
    };
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore — some browsers throw if nothing is speaking
    }
  }, [supported]);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}): Promise<void> => {
      if (!supported) return Promise.resolve();
      const clean = text.trim();
      if (!clean) return Promise.resolve();
      const { lang = "en-US", persona = "neutral", traits, onStart } = options;
      // Prefer explicit resolved traits (teacher override); else derive from the
      // persona label's preset. Prosody is DERIVED, never a per-name table.
      const prosody = prosodyFromTraits(traits ?? resolvePersonaTraits(persona));
      return new Promise<void>((resolve) => {
        try {
          const utterance = new SpeechSynthesisUtterance(clean);
          utterance.onstart = () => onStart?.();
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          utterance.lang = lang;
          utterance.rate = prosody.rate;
          utterance.pitch = prosody.pitch;

          // Best-effort voice selection: among voices matching the language,
          // prefer one whose name hints at the persona's tone; else any match.
          const langPrefix = lang.slice(0, 2).toLowerCase();
          const candidates = voicesRef.current.filter((v) =>
            v.lang?.toLowerCase().startsWith(langPrefix),
          );
          if (candidates.length > 0) {
            const hinted = prosody.voiceHints.length
              ? candidates.find((v) =>
                  prosody.voiceHints.some((h: string) =>
                    v.name.toLowerCase().includes(h),
                  ),
                )
              : undefined;
            utterance.voice = hinted ?? candidates[0];
          }

          window.speechSynthesis.speak(utterance);
        } catch {
          // Speech is best-effort; completion must still settle callers.
          resolve();
        }
      });
    },
    [supported],
  );

  // Stop speech if the component using this hook unmounts (e.g. navigation).
  useEffect(() => {
    return () => {
      if (isSupported()) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return useMemo(
    () => ({ supported, speak, cancel }),
    [supported, speak, cancel],
  );
}
