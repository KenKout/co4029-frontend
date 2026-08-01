import { useCallback, useEffect, useRef, useState } from "react";

import type { QuizQuestionAuthoring } from "@/lib/api/types";

/**
 * Scroll-spy + jump behaviour for the question navigator. Extracted from
 * QuestionNavigator; the hook call order matches what the navigator used inline
 * (activeId → suppression ref → scrollToQuestion → spy effect).
 */
export function useQuestionNavSpy(
  questions: QuizQuestionAuthoring[],
  onJump?: (questionId: string) => void,
) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Suppress scroll-spy briefly after a click so the highlight doesn't
  // flicker through intermediate cards during the smooth scroll.
  const suppressSpyUntil = useRef<number>(0);

  const scrollToQuestion = useCallback(
    (id: string) => {
      const el = document.getElementById(`qcard-${id}`);
      if (!el) return;
      suppressSpyUntil.current = Date.now() + 700;
      setActiveId(id);
      onJump?.(id);
      const reduceMotion =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    },
    [onJump],
  );

  // Scroll-spy: highlight the last card whose top has scrolled above a line
  // just below the sticky header (matches the card's scroll-mt offset).
  useEffect(() => {
    if (questions.length === 0) return;
    let frame = 0;
    const recompute = () => {
      frame = 0;
      if (Date.now() < suppressSpyUntil.current) return;
      const line = 160; // ~9.5rem sticky-header clearance + a little margin
      let current: string | null = questions[0]?.id ?? null;
      for (const q of questions) {
        const el = document.getElementById(`qcard-${q.id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= line) current = q.id;
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(recompute);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    recompute();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [questions]);

  return { activeId, scrollToQuestion };
}
