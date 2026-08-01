import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion, setHashWithoutScroll } from "./scroll";
import type { SectionNavItem } from "./types";

export interface SectionNavScrollController {
  activeId: string;
  navRef: React.RefObject<HTMLElement | null>;
  scrollToSection: (id: string) => void;
}

export function useSectionNavScroll(
  items: SectionNavItem[],
  topOffset: number,
): SectionNavScrollController {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");
  // Suppress scroll-spy briefly while a click-initiated smooth scroll runs,
  // so the active item doesn't flicker through intermediate sections.
  const suppressSpyUntil = useRef<number>(0);
  const activeRef = useRef<string>(activeId);
  activeRef.current = activeId;

  // Height of the nav itself so we can offset scroll targets to sit just
  // below both the global header and this nav (not hidden underneath).
  const navRef = useRef<HTMLElement | null>(null);

  const scrollOffset = useCallback(() => {
    const navHeight = navRef.current?.offsetHeight ?? 52;
    return topOffset + navHeight + 16;
  }, [topOffset]);

  const scrollToSection = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      const top =
        el.getBoundingClientRect().top + window.scrollY - scrollOffset();
      suppressSpyUntil.current = Date.now() + 700;
      setActiveId(id);
      setHashWithoutScroll(id);
      window.scrollTo({
        top: Math.max(0, top),
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    },
    [scrollOffset],
  );

  // Scroll-spy: pick the last section whose top has scrolled above the
  // offset line. A scroll-position approach (vs IntersectionObserver) is
  // predictable across sections of very different heights.
  useEffect(() => {
    let frame = 0;
    const recompute = () => {
      frame = 0;
      if (Date.now() < suppressSpyUntil.current) return;
      const line = scrollOffset() + 4;
      const scrollY = window.scrollY;
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );

      const entries = items
        .map((item) => {
          const el = document.getElementById(item.id);
          if (!el) return null;
          const top = el.getBoundingClientRect().top + scrollY;
          return { id: item.id, activateAt: top - line };
        })
        .filter((e): e is { id: string; activateAt: number } => e !== null);
      if (entries.length === 0) return;

      // Primary pass: the last section whose top has scrolled above the line.
      let current = entries[0].id;
      for (const e of entries) {
        if (e.activateAt <= scrollY) current = e.id;
      }

      const firstUnreachable = entries.findIndex(
        (e) => e.activateAt > maxScroll,
      );
      if (firstUnreachable > 0 && maxScroll > 0) {
        const zoneStart = Math.min(
          entries[firstUnreachable - 1].activateAt,
          maxScroll,
        );
        const span = maxScroll - zoneStart;
        if (span > 0 && scrollY >= zoneStart) {
          const tail = entries.slice(firstUnreachable - 1);
          const progress = Math.min(
            1,
            Math.max(0, (scrollY - zoneStart) / span),
          );
          const step = Math.min(
            tail.length - 1,
            Math.floor(progress * tail.length),
          );
          current = tail[step].id;
        }
      }

      // Absolute bottom always resolves to the final section.
      if (scrollY >= maxScroll - 2) {
        current = entries[entries.length - 1].id;
      }

      if (current && current !== activeRef.current) {
        setActiveId(current);
        setHashWithoutScroll(current);
      }
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
  }, [items, scrollOffset]);

  // Deep-link: on mount, honour an incoming hash so a refreshed URL lands
  // on the right section. Deferred a tick so layout has settled.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    if (!items.some((i) => i.id === hash)) return;
    const timer = window.setTimeout(() => scrollToSection(hash), 60);
    return () => window.clearTimeout(timer);
    // Run once on mount only.
  }, []);

  return { activeId, navRef, scrollToSection };
}
