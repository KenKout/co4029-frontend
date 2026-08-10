import * as React from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Visual treatment. Both were already in the product, hand-rolled per page. */
export type TabsVariant =
  /** Underline strip: bottom-border indicator on a shared rule. Section-level
   *  navigation inside a page (course detail, enrolments, career paths). */
  | "outlined"
  /** Filled pill inside a bordered track — the SectionSwitcher / role-switcher
   *  look. Compact mutually-exclusive switches (audit-log source, list mode). */
  | "contained";

export interface TabDef<T extends string> {
  key: T;
  /** Already-translated label. */
  label: string;
  /** Optional leading icon. */
  icon?: LucideIcon;
  /** Optional count badge shown after the label. */
  count?: number;
  /** Hide the label below `sm`, keeping the icon (long strips on mobile). */
  labelHiddenOnMobile?: boolean;
}

interface TabsBaseProps<T extends string> {
  tabs: TabDef<T>[];
  value: T;
  variant?: TabsVariant;
  /** Accessible name for the tablist. */
  ariaLabel?: string;
  className?: string;
  sticky?: boolean;
  /** From `useStickyTabs()`. Drives the pinned background/shadow. */
  stuck?: boolean;
}

/** State-driven tabs: clicking calls `onChange`. */
interface TabsStateProps<T extends string> extends TabsBaseProps<T> {
  onChange: (key: T) => void;
  /** @deprecated use the link form instead */
  linkTo?: never;
}

/**
 * Route-driven tabs: each tab renders a <Link>. `linkTo` maps a tab key to the
 * router `to`/`params` for that tab. Needed because per-course tabs are real
 * routes (course-shell), not local state — a plain onChange strip cannot
 * express that without losing deep-linking and the back button.
 */
interface TabsLinkProps<T extends string> extends TabsBaseProps<T> {
  onChange?: never;
  linkTo: (key: T) => {
    // Router path strings are a typed union; callers pass their own literal.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    to: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any;
  };
}

export type TabsProps<T extends string> = TabsStateProps<T> | TabsLinkProps<T>;

/** Shared per-tab classes for each variant. */
function tabClasses(
  variant: TabsVariant,
  active: boolean,
  stuckContained: boolean,
) {
  if (variant === "contained") {
    return cn(
      "inline-flex items-center gap-1.5 rounded-md px-3 h-8 text-xs font-semibold transition-colors cursor-pointer",
      active
        ? "bg-primary text-white shadow-sm"
        : "text-text-muted hover:text-primary hover:bg-surface-muted",
      stuckContained && "h-7",
    );
  }
  return cn(
    "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer",
    active
      ? "border-m3-primary text-m3-primary"
      : "border-transparent text-m3-on-surface-variant hover:text-m3-on-surface",
  );
}

function countClasses(variant: TabsVariant, active: boolean) {
  if (variant === "contained") {
    return cn(
      "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
      active ? "bg-white/20 text-white" : "bg-surface-elev text-text-muted",
    );
  }
  return cn(
    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
    active
      ? "bg-m3-primary-fixed text-m3-primary"
      : "bg-m3-surface-container text-m3-on-surface-variant",
  );
}

export function Tabs<T extends string>(props: TabsProps<T>) {
  const {
    tabs,
    value,
    variant = "outlined",
    ariaLabel,
    className,
    sticky,
    stuck,
  } = props;
  const isLink = "linkTo" in props && props.linkTo !== undefined;

  const strip = (
    <div
      role={isLink ? undefined : "tablist"}
      aria-label={ariaLabel}
      data-shortcut="tabs"
      className={cn(
        "flex flex-wrap items-center",
        variant === "contained"
          ? "gap-1 rounded-lg border border-border bg-surface p-1 w-fit"
          : "gap-1 border-b border-m3-outline-variant/30",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const active = tab.key === value;
        const cls = tabClasses(variant, active, Boolean(sticky && stuck));
        const inner = (
          <>
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span className={tab.labelHiddenOnMobile ? "hidden sm:inline" : ""}>
              {tab.label}
            </span>
            {tab.count !== undefined && (
              <span className={countClasses(variant, active)}>{tab.count}</span>
            )}
          </>
        );

        if (isLink) {
          const target = props.linkTo(tab.key);
          return (
            <Link
              key={tab.key}
              to={target.to}
              params={target.params}
              data-tab-index={index + 1}
              aria-current={active ? "page" : undefined}
              className={cls}
            >
              {inner}
            </Link>
          );
        }

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            data-tab-index={index + 1}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => props.onChange?.(tab.key)}
            className={cls}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );

  if (!sticky) return strip;

  // Pinned: solid background once stuck so page content can't bleed through.
  // top-16 clears the global ContentTopBar; z-20 is the in-<main> ceiling.
  return (
    <div
      className={cn(
        "sticky top-16 z-20 -mx-1 px-1 transition-all",
        stuck &&
          "border-b border-m3-outline-variant/30 bg-m3-surface/95 py-1 shadow-sm backdrop-blur-md",
      )}
    >
      {strip}
    </div>
  );
}

/**
 * Detects when a sticky tab strip is actually pinned, so it can switch to a
 * solid background. CSS has no "is stuck" selector, so this watches a
 * zero-height sentinel rendered just above the strip: once it scrolls out of
 * view under the global top bar, the strip is pinned.
 *
 * Same technique as quiz-manage's `useStickyActions` (the screen this behaviour
 * was requested from), generalised. Render `<div ref={sentinelRef} />`
 * immediately before the <Tabs sticky stuck={stuck} />.
 *
 * Uses a CALLBACK ref, not useRef+useEffect: on pages with loading guards the
 * strip mounts only after data arrives, so an effect with `[]` deps would run
 * once against a null node and never re-attach.
 */
export function useStickyTabs() {
  const [stuck, setStuck] = React.useState(false);
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  const sentinelRef = React.useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    if (!node) return;
    // jsdom (and very old browsers) have no IntersectionObserver. Without this
    // guard, merely rendering a sticky strip throws in tests. Degrade to
    // "never stuck": the strip still pins via CSS, it just doesn't gain the
    // solid background.
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      // Top offset = ContentTopBar height (64px / top-16).
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  React.useEffect(
    () => () => {
      observerRef.current?.disconnect();
    },
    [],
  );

  return { stuck, sentinelRef };
}
