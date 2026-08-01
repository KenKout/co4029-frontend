import { useCallback, useEffect, useRef, useState } from "react";

import {
  createRecognition,
  detachRecognition,
  getRecognitionCtor,
  type SpeechDictationError,
  type SpeechRecognitionLike,
} from "@/lib/hooks/use-speech-dictation/web-speech";

export type { SpeechDictationError };

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
 *
 * The Web Speech API shims, the vendor-prefix lookup, the error mapping and the
 * recognizer handler wiring live in `./use-speech-dictation/web-speech`.
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
    const recognition = createRecognition({
      ctor,
      lang,
      onResultRef,
      intentionalStopRef,
      interimRef,
      setInterim,
      setListening,
      setPaused,
      setError,
    });

    recognitionRef.current = recognition;
    return () => {
      detachRecognition(recognition);
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
