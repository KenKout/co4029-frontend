import {
  Archive,
  BookOpen,
  CheckCircle,
  FileEdit,
  type LucideIcon,
} from "lucide-react";

import type { StatusFilter } from "./types";

/**
 * Static option lists of the teacher Courses index, moved verbatim out of the
 * former 234-line courses.tsx.
 */

/**
 * Stat strip tiles, in their original order. `key` is the i18n suffix
 * (`stat_total`, …) while `countKey` is the bucket it reads — they differ for
 * the first tile, which is labelled "total" but counts `all`.
 */
export const STAT_TILES: {
  key: string;
  countKey: StatusFilter;
  icon: LucideIcon;
}[] = [
  { key: "total", countKey: "all", icon: BookOpen },
  { key: "published", countKey: "published", icon: CheckCircle },
  { key: "draft", countKey: "draft", icon: FileEdit },
  { key: "archived", countKey: "archived", icon: Archive },
];

/** Status buckets the segmented filter offers, in their original order. */
export const STATUS_KEYS: StatusFilter[] = [
  "all",
  "published",
  "draft",
  "archived",
];
