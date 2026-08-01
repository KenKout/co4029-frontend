import type { useTranslation } from "react-i18next";

import type { BloomDistribution } from "../quiz-generation-form-controls";

/**
 * Shared types for the quiz generation panel, extracted from the former
 * 975-line `quiz-generation-panel.tsx` so the controller hooks and the
 * presentational columns agree on one definition of the form state instead of
 * re-declaring string unions.
 */

/** `t` exactly as the panel's `useTranslation()` hands it out. */
export type TranslateFn = ReturnType<typeof useTranslation>["t"];

/**
 * Difficulty levels accepted by the backend's
 * ``QuizGenerationRequest.difficulty`` field. ``mixed`` lets the
 * generator vary difficulty across the question set.
 */
export const DIFFICULTIES = ["easy", "medium", "hard", "mixed"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * Question types accepted by the backend's
 * ``QuizGenerationRequest.question_types`` field. The ideation stage
 * cycles through the selected types when allocating per-section
 * budgets — pick at least one. Default is `multiple_choice` to match
 * the historical behavior.
 */
export const QUESTION_TYPES = [
  "multiple_choice",
  "true_false",
  "short_answer",
  "fill_blank",
  // Phase 7 types the generation pipeline can now produce. Keep this list in
  // lockstep with the backend's ``QuizGenerationRequest.question_types``
  // literal — a value the API rejects fails the whole request with a 422.
  "numerical",
  "matching",
  "ordering",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export type GenerationMode = "topic" | "coverage";

/**
 * Form state — typed as a single record so the panel can update fields
 * idiomatically with ``setForm((current) => ({ ...current, ... }))``.
 *
 * Fields named with snake_case mirror the backend payload directly so
 * the form-to-payload translation in ``buildPayload`` is mechanical.
 */
export interface FormState {
  question_count: number;
  difficulty: Difficulty;
  question_types: QuestionType[];
  generation_mode: GenerationMode;
  focus_topics: string[];
  avoid_topics: string[];
  extra_instructions: string;
  append: boolean;
  coverage_min_per_section: number;
  coverage_max_per_section: number;
  skip_summaries: boolean;
  slides_per_section: number;
  section_grouping: "auto" | "fixed";
  /** Map of lesson_id → checked section_ids, keyed for stable updates. */
  selected_section_ids: Record<string, string[]>;
  bloom_enabled: boolean;
  bloom_distribution: BloomDistribution;
  /** Course learning-outcome ids the generated questions should target. */
  target_outcome_ids: string[];
}

/** The ``coverage_options`` sub-payload, mirroring the backend schema. */
export interface CoverageOptionsPayload {
  min_per_section: number;
  max_per_section: number;
  skip_summaries: boolean;
  slides_per_section: number;
  section_grouping: "auto" | "fixed";
  section_ids: string[] | null;
}
