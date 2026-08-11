import { useEffect, useSyncExternalStore, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

// ── Global "bump" store ─────────────────────────────────────────────────
// The button lives ONCE at the shell level (AppShell), so a page that shows
// a fixed bottom overlay at the same corner can no longer pass className to
// its own instance. It nudges the global one through this tiny external
// store instead (useSyncExternalStore) — e.g. quiz-manage lifts the button
// above the combo-undo banner while deletes are pending.
let bumpClass = "";
const bumpListeners = new Set<() => void>();

function notifyBumpListeners() {
  bumpListeners.forEach((listener) => listener());
}

/** Lift the shell-level button above a page-level bottom overlay. */
export function setScrollToTopBump(className: string) {
  if (bumpClass === className) return;
  bumpClass = className;
  notifyBumpListeners();
}

function subscribeScrollToTopBump(listener: () => void) {
  bumpListeners.add(listener);
  return () => {
    bumpListeners.delete(listener);
  };
}

function getScrollToTopBump(): string {
  return bumpClass;
}

/**
 * Floating "back to top" button for long scrolling pages.
 *
 * Mounted ONCE in AppShell (every authenticated screen gets it — pages used
 * to each import it, and most forgot, so the affordance was inconsistent).
 * Appears fixed in the bottom-right corner once the window has scrolled past
 * `showAfter` px, and smooth-scrolls to the top on click (honouring
 * prefers-reduced-motion). Hidden entirely near the top so it never covers
 * content on short pages. Skipped entirely during immersive routes (live
 * interview workspaces have no chrome).
 *
 * Sits at z-30 — above page content (which AGENTS.md caps at z-20) but below
 * the sidebar (z-40), so it never floats over navigation. Anchored bottom-right
 * clear of the sidebar's left gutter.
 *
 * `className` is appended last so a page can move the anchor when something
 * else occupies the bottom-right; the `bump` store feeds the same channel
 * from pages that render fixed bottom overlays (see setScrollToTopBump).
 */
export function ScrollToTop({
  showAfter = 400,
  className,
}: {
  showAfter?: number;
  className?: string;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const bump = useSyncExternalStore(
    subscribeScrollToTopBump,
    getScrollToTopBump,
  );

  useEffect(() => {
    let frame = 0;
    const recompute = () => {
      frame = 0;
      setVisible(window.scrollY > showAfter);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(recompute);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    recompute();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [showAfter]);

  function scrollTop() {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  const label = t("common.back_to_top", "Back to top");

  return (
    <button
      type="button"
      onClick={scrollTop}
      aria-label={label}
      title={label}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "fixed bottom-6 right-6 z-30 flex h-11 w-11 items-center justify-center rounded-full",
        "gradient-primary text-white shadow-glass transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-ai-glow active:translate-y-0 active:scale-95",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/50",
        visible
          ? "opacity-100 translate-y-0"
          : "pointer-events-none translate-y-2 opacity-0",
        bump,
        className,
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

export default ScrollToTop;
