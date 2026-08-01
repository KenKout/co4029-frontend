import { cn } from "@/lib/utils";
import { SectionNavButton } from "./section-nav/nav-button";
import type { SectionNavProps } from "./section-nav/types";
import { useSectionNavScroll } from "./section-nav/use-section-nav-scroll";

export type { SectionNavItem, SectionStatus } from "./section-nav/types";

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
  const { activeId, navRef, scrollToSection } = useSectionNavScroll(
    items,
    topOffset,
  );

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
          {items.map((item) => (
            <li key={item.id} className="min-w-fit flex-1 lg:flex-1">
              <SectionNavButton
                item={item}
                isActive={item.id === activeId}
                onSelect={scrollToSection}
              />
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default SectionNav;
