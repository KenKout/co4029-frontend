import { useCallback, useEffect, useRef, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Per-section status shown inside a {@link SectionNav} item.
 *
 * - `completed` → green text + check icon (e.g. "Completed", "8/8 approved")
 * - `warning`   → amber text + warning icon (e.g. "Not added")
 * - `info`      → neutral muted text, no icon (e.g. "8 generated")
 * - `none`      → no status affix
 *
 * Status is NEVER communicated by colour alone — every non-neutral state
 * pairs the colour with an icon and text, and carries an accessible label.
 */
export type SectionStatus =
  | { kind: "completed"; label: string; srLabel?: string }
  | { kind: "warning"; label: string; srLabel?: string }
  | { kind: "info"; label: string; srLabel?: string }
  | { kind: "none" };

export interface SectionNavItem {
  /** DOM id of the target section (without the leading `#`). */
  id: string;
  /** Visible label, e.g. "Settings". */
  label: string;
  /** Shortened label for tablet widths; falls back to `label`. */
  shortLabel?: string;
  status?: SectionStatus;
}

interface SectionNavProps {
  items: SectionNavItem[];
  /**
   * Sticky offset from the top of the viewport in px — normally the height
   * of the global header the nav sits beneath. Also used to decide which
   * section is "active" during scroll-spy. Defaults to 64 (h-16 top bar).
   */
  topOffset?: number;
  /** Accessible label for the `<nav>` landmark. */
  ariaLabel: string;
  className?: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Reflect the active section in `location.hash` WITHOUT triggering a scroll
 * jump.
 *
 * TanStack Router monkeypatches `window.history.replaceState`: every call
 * notifies the router, whose scroll-restoration then reads the new hash and
 * runs `el.scrollIntoView(state.__hashScrollIntoViewOptions ?? true)`. A naive
 * `replaceState(null, "", "#id")` therefore (a) force-scrolls the section to
 * the viewport top — ignoring our sticky-header offset, which is the "jumps up
 * and skips content" bug when scroll-spy updates the hash mid-scroll — and
 * (b) clobbers the router's own `__TSR_key`/`__TSR_index` bookkeeping by
 * passing `null` state.
 *
 * We instead PRESERVE the existing history state and set
 * `__hashScrollIntoViewOptions: false`, so the router leaves our scroll
 * position untouched. SectionNav does its own offset-aware scrolling on click.
 */
function setHashWithoutScroll(id: string) {
  if (typeof history.replaceState !== "function") return;
  const url = `${window.location.pathname}${window.location.search}#${id}`;
  const prevState =
    (window.history.state as Record<string, unknown> | null) ?? {};
  history.replaceState(
    { ...prevState, __hashScrollIntoViewOptions: false },
    "",
    url,
  );
}

function StatusAffix({ status }: { status: SectionStatus }) {
  if (status.kind === "none") return null;

  if (status.kind === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          {status.label}
          {status.srLabel && (
            <span className="sr-only"> — {status.srLabel}</span>
          )}
        </span>
      </span>
    );
  }

  if (status.kind === "warning") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          {status.label}
          {status.srLabel && (
            <span className="sr-only"> — {status.srLabel}</span>
          )}
        </span>
      </span>
    );
  }

  // info — neutral, no icon
  return (
    <span className="text-m3-on-surface-variant">
      <span aria-hidden="true">· </span>
      {status.label}
      {status.srLabel && <span className="sr-only"> — {status.srLabel}</span>}
    </span>
  );
}

/**
 * Compact, sticky, segmented section navigation with scroll-spy, smooth
 * scrolling, URL-hash sync and responsive (desktop / tablet / mobile) layout.
 *
 * Behaviour:
 * - Highlights the section currently in view; updates `location.hash` via
 *   `replaceState` (no reload, no history spam).
 * - Clicking an item smooth-scrolls to the section (honours reduced-motion).
 * - On mount, if the URL carries a matching hash, scrolls to that section.
 * - Fully keyboard-operable; active item carries `aria-current="location"`.
 *
 * The component owns NO business logic — it only navigates between and
 * reports status for sections that already exist in the DOM.
 */
export function SectionNav({
  items,
  topOffset = 64,
  ariaLabel,
  className,
}: SectionNavProps) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className={cn("sticky z-10 -mx-1 px-1", className)}
      style={{ top: topOffset }}
    >
      <div className="rounded-lg border border-border bg-white/95 backdrop-blur-sm shadow-sm">
        <ul
          className={cn(
            "flex items-stretch gap-1 p-1",
            // Mobile: horizontal scroll, no wrap, keep active item reachable.
            "overflow-x-auto no-scrollbar",
            // Desktop: fill width evenly.
            "lg:overflow-visible",
          )}
        >
          {items.map((item) => {
            const isActive = item.id === activeId;
            const status = item.status ?? { kind: "none" };
            return (
              <li key={item.id} className="min-w-fit flex-1 lg:flex-1">
                <button
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "group w-full h-full rounded-md px-3 py-2 text-left transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                    "whitespace-nowrap cursor-pointer",
                    isActive
                      ? "bg-primary-soft text-primary"
                      : "text-m3-on-surface hover:bg-surface-muted",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-4 w-0.5 rounded-full shrink-0 transition-colors",
                        isActive ? "bg-primary" : "bg-transparent",
                      )}
                    />
                    <span className="text-[13px] font-bold">
                      <span className="lg:hidden xl:inline">{item.label}</span>
                      <span className="hidden lg:inline xl:hidden">
                        {item.shortLabel ?? item.label}
                      </span>
                    </span>
                  </span>
                  {status.kind !== "none" && (
                    <span className="mt-0.5 block pl-3 text-[11px] leading-tight">
                      <StatusAffix status={status} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export default SectionNav;
