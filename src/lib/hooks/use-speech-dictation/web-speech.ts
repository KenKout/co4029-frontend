/**
 * Web Speech API shims and recognition wiring for `use-speech-dictation.ts`.
 *
 * The DOM lib ships no SpeechRecognition types, so the minimal structural
 * shapes the hook relies on live here alongside the vendor-prefix lookup, the
 * error mapping, and the handler attach/detach helpers. Moved verbatim out of
 * the hook so its own body stays inside the size budget.
 */

/** Minimal Web Speech API types because the DOM library does not include them. */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
  length: number;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
}

export interface SpeechRecognitionLike {
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

export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return (
    browserWindow.SpeechRecognition ??
    browserWindow.webkitSpeechRecognition ??
    null
  );
}

export type SpeechDictationError =
  | "permission-denied"
  | "no-microphone"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "interrupted"
  | "unsupported";

export function normalizeRecognitionError(error: string): SpeechDictationError {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "permission-denied";
    case "audio-capture":
      return "audio-capture";
    case "no-speech":
      return "no-speech";
    case "network":
      return "network";
    case "aborted":
      return "interrupted";
    default:
      return "no-microphone";
  }
}

/** The final and interim text contributed by one `onresult` event. */
export interface TranscriptChunks {
  finalChunk: string;
  interimChunk: string;
}

export function collectTranscriptChunks(
  event: SpeechRecognitionEventLike,
): TranscriptChunks {
  let finalChunk = "";
  let interimChunk = "";
  for (
    let index = event.resultIndex;
    index < event.results.length;
    index += 1
  ) {
    const result = event.results[index];
    const text = result[0]?.transcript ?? "";
    if (result.isFinal) finalChunk += text;
    else interimChunk += text;
  }
  return { finalChunk, interimChunk };
}

/** Mutable ref shape, structurally compatible with React's `useRef` result. */
interface Ref<T> {
  current: T;
}

export interface RecognitionWiring {
  ctor: SpeechRecognitionCtor;
  lang: string;
  onResultRef: Ref<(finalText: string) => void>;
  intentionalStopRef: Ref<boolean>;
  interimRef: Ref<string>;
  setInterim: (interim: string) => void;
  setListening: (listening: boolean) => void;
  setPaused: (paused: boolean) => void;
  setError: (error: SpeechDictationError) => void;
}

/**
 * Build a configured recognizer with the hook's three handlers attached. The
 * handler bodies are unchanged from the hook's setup effect.
 */
export function createRecognition(
  wiring: RecognitionWiring,
): SpeechRecognitionLike {
  const recognition = new wiring.ctor();
  recognition.lang = wiring.lang;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    const { finalChunk, interimChunk } = collectTranscriptChunks(event);
    if (finalChunk.trim() && !wiring.intentionalStopRef.current) {
      wiring.onResultRef.current(finalChunk.trim());
    }
    wiring.interimRef.current = interimChunk;
    wiring.setInterim(interimChunk);
  };

  recognition.onerror = (event) => {
    wiring.setListening(false);
    if (!wiring.intentionalStopRef.current) {
      wiring.setPaused(false);
      wiring.setError(normalizeRecognitionError(event.error));
    }
  };

  recognition.onend = () => {
    wiring.setListening(false);
    wiring.interimRef.current = "";
    wiring.setInterim("");
    wiring.intentionalStopRef.current = false;
  };

  return recognition;
}

/** Detach every handler and abort the recognizer (setup-effect cleanup). */
export function detachRecognition(recognition: SpeechRecognitionLike): void {
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  try {
    recognition.abort();
  } catch {
    // The recognizer may already be inactive.
  }
}
