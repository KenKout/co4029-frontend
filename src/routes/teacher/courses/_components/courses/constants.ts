import type { StatusFilter } from "./types";

/**
 * Static option lists of the teacher Courses index, moved verbatim out of the
 * former 234-line courses.tsx.
 *
 * `STAT_TILES` used to live here for the stat strip above the toolbar. That box
 * duplicated the numbers the status filter already carries, so it was removed
 * and the counts now render as badges on the status tabs.
 */

/** Status buckets the status tabs offer, in their original order. */
export const STATUS_KEYS: StatusFilter[] = [
  "all",
  "published",
  "draft",
  "archived",
];
