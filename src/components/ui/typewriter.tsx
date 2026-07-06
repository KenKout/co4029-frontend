import { useState, useEffect } from "react";

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  cursor?: boolean;
}

export function Typewriter({ text, speed = 50, delay = 0, className = "", cursor = false }: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, speed, started]);

  return (
    <span className={className}>
      {displayedText}
      {cursor && !done && (
        <span className="inline-block w-[2px] h-[1em] bg-current ml-1 align-middle animate-pulse" />
      )}
    </span>
  );
}
