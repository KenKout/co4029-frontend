import { useCallback, useEffect, useRef, useState } from "react";

/** Minimal Web Speech API types because the DOM library does not include them. */
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

function normalizeRecognitionError(error: string): SpeechDictationError {
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

export interface UseSpeechDictationOptions {
  /** BCP-47 language tag, for example en-US or vi-VN. */
  lang?: string;
  /** Called with each finalized transcript chunk. */
  onResult: (finalText: string) => void;
}

export interface UseSpeechDictation {
  supported: boolean;
  listening: boolean;
  paused: boolean;
  interim: string;
  error: SpeechDictationError | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  /** Stops capture and returns the last uncommitted interim text. */
  stop: () => string;
  cancel: () => void;
  retry: () => void;
  toggle: () => void;
}

/**
 * Browser speech-to-text for hybrid interview answers. Final chunks are
 * appended to the canonical answer draft by the caller, so switching between
 * voice and typing never discards candidate input.
 */
export function useSpeechDictation({
  lang = "en-US",
  onResult,
}: UseSpeechDictationOptions): UseSpeechDictation {
  const ctor = getRecognitionCtor();
  const supported = ctor !== null;
  const [listening, setListening] = useState(false);
  const [paused, setPaused] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<SpeechDictationError | null>(
    supported ? null : "unsupported",
  );

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const interimRef = useRef("");
  const intentionalStopRef = useRef(false);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (!ctor) return;
    const recognition = new ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
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
      if (finalChunk.trim() && !intentionalStopRef.current) {
        onResultRef.current(finalChunk.trim());
      }
      interimRef.current = interimChunk;
      setInterim(interimChunk);
    };

    recognition.onerror = (event) => {
      setListening(false);
      if (!intentionalStopRef.current) {
        setPaused(false);
        setError(normalizeRecognitionError(event.error));
      }
    };

    recognition.onend = () => {
      setListening(false);
      interimRef.current = "";
      setInterim("");
      intentionalStopRef.current = false;
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // The recognizer may already be inactive.
      }
      recognitionRef.current = null;
    };
  }, [ctor, lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || listening) {
      if (!recognition) setError("unsupported");
      return;
    }
    try {
      intentionalStopRef.current = false;
      recognition.start();
      setListening(true);
      setPaused(false);
      setError(null);
      interimRef.current = "";
      setInterim("");
    } catch {
      setError("interrupted");
    }
  }, [listening]);

  const stop = useCallback(() => {
    const pendingInterim = interimRef.current.trim();
    try {
      intentionalStopRef.current = true;
      recognitionRef.current?.stop();
    } catch {
      // The recognizer may already be inactive.
    }
    setListening(false);
    setPaused(false);
    interimRef.current = "";
    setInterim("");
    return pendingInterim;
  }, []);

  const pause = useCallback(() => {
    const pendingInterim = interimRef.current.trim();
    if (pendingInterim) onResultRef.current(pendingInterim);
    try {
      intentionalStopRef.current = true;
      recognitionRef.current?.stop();
    } catch {
      // The recognizer may already have stopped after a natural pause.
    }
    setListening(false);
    setPaused(true);
    interimRef.current = "";
    setInterim("");
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
    start();
  }, [start]);

  const cancel = useCallback(() => {
    intentionalStopRef.current = true;
    try {
      recognitionRef.current?.abort();
    } catch {
      // The recognizer may already be inactive.
    }
    setListening(false);
    setPaused(false);
    interimRef.current = "";
    setInterim("");
  }, []);

  const retry = useCallback(() => {
    setError(null);
    start();
  }, [start]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return {
    supported,
    listening,
    paused,
    interim,
    error,
    start,
    pause,
    resume,
    stop,
    cancel,
    retry,
    toggle,
  };
}
