import { useCallback, useEffect, useRef, useState } from "react";

export type QuizCameraError =
  | "permission-denied"
  | "no-camera"
  | "camera-unavailable"
  | "unsupported"
  | "inactive-track";

export interface QuizCameraController {
  required: boolean;
  active: boolean;
  checking: boolean;
  error: QuizCameraError | null;
  stream: MediaStream | null;
  ensureActive: () => Promise<boolean>;
  retry: () => Promise<boolean>;
  stop: () => void;
}

function hasActiveVideoTrack(stream: MediaStream | null): boolean {
  return Boolean(
    stream?.getVideoTracks().some(
      (track) => track.readyState === "live" && !track.muted,
    ),
  );
}

function classifyCameraError(error: unknown): QuizCameraError {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "permission-denied";
    }
    if (error.name === "NotFoundError") return "no-camera";
    if (
      error.name === "NotReadableError" ||
      error.name === "AbortError" ||
      error.name === "OverconstrainedError"
    ) {
      return "camera-unavailable";
    }
  }
  return "camera-unavailable";
}

/** Local-only camera preflight and interruption guard for required-camera quizzes. */
export function useQuizCamera(
  required: boolean,
  keepAlive: boolean,
): QuizCameraController {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<QuizCameraError | null>(null);
  const interruptionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  streamRef.current = stream;

  const stop = useCallback(() => {
    if (interruptionTimerRef.current) {
      clearTimeout(interruptionTimerRef.current);
      interruptionTimerRef.current = null;
    }
    const current = streamRef.current;
    current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setActive(false);
    setChecking(false);
  }, []);

  const ensureActive = useCallback(async (): Promise<boolean> => {
    if (!required) return true;
    if (hasActiveVideoTrack(streamRef.current)) {
      setActive(true);
      setError(null);
      return true;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setError("unsupported");
      setActive(false);
      return false;
    }

    setChecking(true);
    setError(null);
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      if (!hasActiveVideoTrack(next)) {
        next.getTracks().forEach((track) => track.stop());
        setError("inactive-track");
        setActive(false);
        return false;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setStream(next);
      setActive(true);
      return true;
    } catch (cameraError) {
      setActive(false);
      setError(classifyCameraError(cameraError));
      return false;
    } finally {
      setChecking(false);
    }
  }, [required]);

  const scheduleInterruption = useCallback(() => {
    if (interruptionTimerRef.current) return;
    interruptionTimerRef.current = setTimeout(() => {
      interruptionTimerRef.current = null;
      if (!hasActiveVideoTrack(streamRef.current)) {
        setActive(false);
        setError("camera-unavailable");
      }
    }, 4000);
  }, []);

  useEffect(() => {
    if (!required || !keepAlive || !stream) return;

    const onTrackLost = () => scheduleInterruption();
    const onTrackRestored = () => {
      if (hasActiveVideoTrack(streamRef.current)) {
        if (interruptionTimerRef.current) {
          clearTimeout(interruptionTimerRef.current);
          interruptionTimerRef.current = null;
        }
        setActive(true);
        setError(null);
      }
    };
    const tracks = stream.getVideoTracks();
    for (const track of tracks) {
      track.addEventListener("ended", onTrackLost);
      track.addEventListener("mute", onTrackLost);
      track.addEventListener("unmute", onTrackRestored);
    }
    const onDeviceChange = () => {
      if (hasActiveVideoTrack(streamRef.current)) onTrackRestored();
      else onTrackLost();
    };
    navigator.mediaDevices?.addEventListener("devicechange", onDeviceChange);

    return () => {
      for (const track of tracks) {
        track.removeEventListener("ended", onTrackLost);
        track.removeEventListener("mute", onTrackLost);
        track.removeEventListener("unmute", onTrackRestored);
      }
      navigator.mediaDevices?.removeEventListener("devicechange", onDeviceChange);
    };
  }, [keepAlive, required, scheduleInterruption, stream]);

  useEffect(() => {
    if (required && keepAlive) return;
    stop();
  }, [keepAlive, required, stop]);

  useEffect(() => stop, [stop]);

  return {
    required,
    active: !required || active,
    checking,
    error,
    stream,
    ensureActive,
    retry: ensureActive,
    stop,
  };
}
