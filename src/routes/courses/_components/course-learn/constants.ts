/**
 * Constant tables for the student course-learn screen, extracted from the
 * former 1.2k-line course-learn.tsx.
 */

export const TABS = ["Lesson Notes", "Discussion", "Resources"] as const;

/**
 * `?tab=` URL value → tab label. Deep-links (notably the discussion
 * notification's action URL) address tabs by a stable lowercase slug so the
 * link does not break when a visible label is reworded or translated.
 */
export const TAB_BY_PARAM: Record<string, (typeof TABS)[number]> = {
  notes: "Lesson Notes",
  "lesson-notes": "Lesson Notes",
  discussion: "Discussion",
  resources: "Resources",
};
