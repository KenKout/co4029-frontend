/**
 * Fallback wall-clock timer for the voice call header.
 *
 * Moved verbatim out of `voice-controls.tsx`; it is only used when the caller
 * passes no `elapsed` prop.
 */
import { useEffect, useRef, useState } from "react";

export function useElapsedTimer() {
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}
