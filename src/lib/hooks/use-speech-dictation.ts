import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser speech-to-text dictation via the Web Speech API
 * (`SpeechRecognition` / `webkitSpeechRecognition`).
 *
 * This powers the per-question voice input in HYBRID interview sessions:
 * the student speaks, the browser transcribes to text locally, and the text
 * is submitted through the normal REST `/respond` path. No server changes,
 * no LiveKit — the same text brain scores the answer.
 *
 * Not all browsers implement the API (Firefox notably does not). Callers
 * should check `supported` and fall back to the textarea when it is false.
 *
 * The recognizer is configured with `interimResults` so the caller can show
 * a live partial transcript; the finalized chunks are accumulated and handed
 * back through `onResult` so they can be appended to the answer draft.
 */

// Minimal typings — the DOM lib does not ship SpeechRecognition types.
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechDictationOptions {
  /** BCP-47 language tag, e.g. "en-US" or "vi-VN". */
  lang?: string;
  /** Called with each finalized transcript chunk (already trimmed). */
  onResult: (finalText: string) => void;
}

export interface UseSpeechDictation {
  /** Whether the browser exposes the Web Speech API at all. */
  supported: boolean;
  /** True while actively listening. */
  listening: boolean;
  /** Live, not-yet-finalized transcript (for display only). */
  interim: string;
  /** Begin listening. No-op when unsupported or already listening. */
  start: () => void;
  /** Stop listening and finalize. */
  stop: () => void;
  /** Toggle listening on/off. */
  toggle: () => void;
}

export function useSpeechDictation({
  lang = "en-US",
  onResult,
}: UseSpeechDictationOptions): UseSpeechDictation {
  const ctor = getRecognitionCtor();
  const supported = ctor !== null;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Keep the latest onResult without re-creating the recognizer each render.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // (Re)build the recognizer when support or language changes.
  useEffect(() => {
    if (!ctor) return;
    const recognition = new ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalChunk += text;
        else interimChunk += text;
      }
      if (finalChunk.trim()) {
        onResultRef.current(finalChunk.trim());
      }
      setInterim(interimChunk);
    };
    recognition.onerror = () => {
      setListening(false);
      setInterim("");
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // ignore — already stopped
      }
      recognitionRef.current = null;
    };
  }, [ctor, lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || listening) return;
    try {
      recognition.start();
      setListening(true);
      setInterim("");
    } catch {
      // start() throws if called while already started — ignore.
    }
  }, [listening]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      // ignore
    }
    setListening(false);
    setInterim("");
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, interim, start, stop, toggle };
}
