import { useEffect, useMemo, useState } from "react";

/**
 * Live-ticking elapsed timer. Freezes at the terminal timestamp when done.
 *
 * Extracted verbatim from the pre-split `GenerationProgress.tsx`; the 1s
 * interval is created only while `startedAt` is set and `frozenEnd` is not,
 * and is cleared on unmount or on the running -> frozen transition.
 */
export function useElapsedSeconds(
  startedAt: string | null | undefined,
  frozenEnd: string | null | undefined,
): number {
  const [now, setNow] = useState(() => Date.now());
  const running = Boolean(startedAt) && !frozenEnd;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return useMemo(() => {
    if (!startedAt) return 0;
    const start = new Date(startedAt).getTime();
    const end = frozenEnd ? new Date(frozenEnd).getTime() : now;
    return Math.max(0, (end - start) / 1000);
  }, [startedAt, frozenEnd, now]);
}
