import { useCallback, useEffect, useRef, useState } from "react";

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

/** Interview AI persona — drives the spoken tone (rate + pitch). */
export type SpeechPersona = "strict" | "neutral" | "supportive";

/**
 * Persona → prosody mapping. Browser TTS only exposes rate + pitch (0–2, with
 * ~0.1 steps audibly distinct), so persona is expressed through pacing and
 * pitch rather than a distinct trained voice:
 *   - strict: slower + lower — firm, deliberate.
 *   - neutral: default cadence.
 *   - supportive: slightly faster + higher — warm, encouraging.
 * `voiceHints` are lowercase substrings we prefer when matching an installed
 * voice for the language (best-effort; falls back to any lang match).
 */
const PERSONA_PROSODY: Record<
  SpeechPersona,
  { rate: number; pitch: number; voiceHints: string[] }
> = {
  strict: { rate: 0.9, pitch: 0.85, voiceHints: ["daniel", "male", "google uk english male"] },
  neutral: { rate: 1.0, pitch: 1.0, voiceHints: [] },
  supportive: { rate: 1.04, pitch: 1.12, voiceHints: ["samantha", "female", "google uk english female"] },
};

export interface SpeakOptions {
  lang?: string;
  persona?: SpeechPersona;
}

export interface UseSpeechSynthesis {
  /** Whether the browser exposes speechSynthesis. */
  supported: boolean;
  /** Speak the given text, cancelling any in-flight utterance first. */
  speak: (text: string, options?: SpeakOptions) => void;
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
    (text: string, options: SpeakOptions = {}) => {
      if (!supported) return;
      const clean = text.trim();
      if (!clean) return;
      const { lang = "en-US", persona = "neutral" } = options;
      const prosody = PERSONA_PROSODY[persona] ?? PERSONA_PROSODY.neutral;
      try {
        // Interrupt whatever is currently being spoken so the newest AI turn
        // takes over immediately rather than queueing behind stale speech.
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(clean);
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
                prosody.voiceHints.some((h) => v.name.toLowerCase().includes(h)),
              )
            : undefined;
          utterance.voice = hinted ?? candidates[0];
        }

        window.speechSynthesis.speak(utterance);
      } catch {
        // ignore — speech is best-effort
      }
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

  return { supported, speak, cancel };
}
