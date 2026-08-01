export function prefersReducedMotion(): boolean {
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
export function setHashWithoutScroll(id: string) {
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
