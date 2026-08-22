/**
 * Stick-to-bottom semantics for the interview transcript scroller.
 *
 * Extracted from the stage so the geometry rule is testable without a layout
 * engine: "near the bottom" means the content below the fold fits within the
 * threshold, NOT an exact-bottom comparison — the newest beat (a live agent
 * turn, the typing indicator) already adds height the moment it mounts, so an
 * exact check would un-pin the scroller on the very update it should follow.
 */

/** Distance from the bottom (px) within which the scroller stays pinned. */
export const STICK_TO_BOTTOM_THRESHOLD_PX = 120;

export function isNearBottom(
  element: { scrollHeight: number; scrollTop: number; clientHeight: number },
  threshold = STICK_TO_BOTTOM_THRESHOLD_PX,
): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
}
