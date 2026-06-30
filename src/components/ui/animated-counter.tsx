import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: string;
  className?: string;
}

/**
 * Counts up numeric portion of a stat string (e.g. "500k+" → counts to 500, appends "k+").
 * Triggered once the element scrolls into view.
 */
export function AnimatedCounter({ value, className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          observer.disconnect();

          // Parse numeric part and suffix
          const match = value.match(/^([\d.]+)(.*)$/);
          if (!match) return;

          const target = parseFloat(match[1]);
          const suffix = match[2];
          const isDecimal = match[1].includes(".");
          const duration = 1600;
          const start = performance.now();

          const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = eased * target;

            if (isDecimal) {
              setDisplay(current.toFixed(1) + suffix);
            } else {
              setDisplay(Math.floor(current).toString() + suffix);
            }

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              setDisplay(value);
            }
          };

          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
