/**
 * Wall-clock timer for the interview session, formatted for display.
 *
 * Split out of `components/interview/interview-workspace.tsx` (Step 2 of that
 * file's decomposition). Distinct from `formatRelativeInterviewTime`: this one
 * ticks and is zero-padded (`04:56`) for the header readout, while that one is a
 * pure format used for transcript offsets (`4:56`).
 */

import { useEffect, useRef, useState } from "react";

/**
 * @param active Whether the clock should be running.
 * @param startedAtMs Epoch ms the timer counts from. When omitted the first
 *   active render becomes the origin, so a caller that has no server timestamp
 *   still gets a sensible elapsed value.
 */
export function useInterviewTimer(
  active: boolean,
  startedAtMs?: number | null,
) {
  const [seconds, setSeconds] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    if (startedAtMs != null) startedAtRef.current = startedAtMs;
    else if (startedAtRef.current === null) startedAtRef.current = Date.now();
    const update = () => {
      if (startedAtRef.current === null) return;
      setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [active, startedAtMs]);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
