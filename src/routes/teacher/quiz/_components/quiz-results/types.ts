/**
 * Shared types for the teacher quiz-results page, extracted from the former
 * 413-line `quiz/quiz-results.tsx` so the tab bar, the panels and the page
 * shell agree on one definition instead of re-declaring string unions.
 */

import type { useTranslation } from "react-i18next";

/** `t` exactly as the page's `useTranslation()` hands it out. */
export type TranslateFn = ReturnType<typeof useTranslation>["t"];

/** The seven top-level tabs of the results workspace. */
export type ResultsTab =
  | "students"
  | "questions"
  | "responses"
  | "statistics"
  | "grading"
  | "gradebook"
  | "audit";

/** Which per-student attempt drives the headline score column. */
export type HeadlineMetric = "best" | "latest";
