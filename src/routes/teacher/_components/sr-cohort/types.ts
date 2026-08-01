import type { useTranslation } from "react-i18next";

/**
 * Shared types for the SR cohort screen, extracted from the former 561-line
 * `sr-cohort.tsx` so the lesson picker, the histogram and the difficult-card
 * rows agree on one definition.
 */

/** `t` exactly as the page's `useTranslation()` hands it out. */
export type TranslateFn = ReturnType<typeof useTranslation>["t"];

/** One entry of the flattened module → lesson picker list. */
export type LessonOption = {
  lesson_id: string;
  lesson_title: string;
  module_title: string;
};
