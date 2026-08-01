import { useCallback, useRef, useState } from "react";

/**
 * "Icons-only when stuck" needs to know when the sticky action strip is
 * actually pinned. CSS can't express that, so we watch a zero-height
 * sentinel placed just above the strip: when it scrolls out of view under
 * the global top bar, the strip is stuck and we condense it to icons.
 * NOTE: these hooks MUST stay above the early returns in the page (loading /
 * not-found guards) — hooks after a conditional return violate the rules
 * of hooks and throw React error #310 once the data loads.
 *
 * Extracted from quiz-manage.tsx verbatim.
 */
export function useStickyActions() {
  const [actionsStuck, setActionsStuck] = useState(false);
  const stickyObserverRef = useRef<IntersectionObserver | null>(null);
  // CALLBACK ref (not useRef + useEffect): the sentinel only mounts AFTER the
  // loading / not-found early returns pass, so an effect with [] deps would
  // run once while the node is still null and never re-attach. A callback ref
  // fires exactly when the node mounts (and unmounts), so the observer always
  // attaches once the real content renders.
  const stickySentinelRef = useCallback((node: HTMLDivElement | null) => {
    stickyObserverRef.current?.disconnect();
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActionsStuck(!entry.isIntersecting),
      // rootMargin top offset = global ContentTopBar height (64px / top-16)
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(node);
    stickyObserverRef.current = observer;
  }, []);

  return { actionsStuck, stickySentinelRef };
}

export type StickyActionsController = ReturnType<typeof useStickyActions>;
