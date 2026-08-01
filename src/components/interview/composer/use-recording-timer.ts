import { useEffect, useRef, useState } from "react";

/**
 * Elapsed recording seconds that survives pause/resume: time accumulates per
 * active segment and resets only once recording stops entirely.
 */
export function useRecordingTimer(active: boolean, paused: boolean) {
  const [seconds, setSeconds] = useState(0);
  const accumulatedRef = useRef(0);
  const segmentStartedRef = useRef<number | null>(null);
  const wasRecordingRef = useRef(false);

  useEffect(() => {
    const recording = active || paused;
    if (!recording && wasRecordingRef.current) {
      accumulatedRef.current = 0;
      segmentStartedRef.current = null;
      setSeconds(0);
    }
    wasRecordingRef.current = recording;

    if (!active) return;
    if (segmentStartedRef.current === null)
      segmentStartedRef.current = Date.now();
    const update = () => {
      const segmentStarted = segmentStartedRef.current;
      if (segmentStarted === null) return;
      setSeconds(
        accumulatedRef.current +
          Math.floor((Date.now() - segmentStarted) / 1000),
      );
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearInterval(timer);
      const segmentStarted = segmentStartedRef.current;
      if (segmentStarted !== null) {
        accumulatedRef.current += Math.floor(
          (Date.now() - segmentStarted) / 1000,
        );
        segmentStartedRef.current = null;
      }
    };
  }, [active, paused]);

  return seconds;
}
