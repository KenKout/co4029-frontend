import type { BloomDistribution } from "../quiz-generation-form-controls";
import type { CoverageOptionsPayload, FormState } from "./types";

/**
 * Pure form-to-payload translation and validation for the quiz generation
 * panel, extracted from the former 975-line `quiz-generation-panel.tsx`. React
 * free, so the wire shape can be reasoned about (and unit-tested) without
 * mounting the panel.
 */

/**
 * Filter a sparse Bloom map down to non-zero entries — the backend
 * treats absent keys and 0-valued keys the same (let the generator
 * decide), but a sparse payload keeps wire traffic small and matches
 * the legacy behaviour.
 */
export function buildBloomDistribution(
  enabled: boolean,
  distribution: BloomDistribution,
): Record<string, number> {
  if (!enabled) return {};
  const filtered: Record<string, number> = {};
  for (const [level, count] of Object.entries(distribution)) {
    if (count > 0) filtered[level] = count;
  }
  return filtered;
}

/**
 * Build the ``coverage_options`` sub-payload. Returns ``null`` for
 * topic mode; the backend interprets ``null`` as "no coverage
 * planning, use topic-mode pipeline".
 *
 * ``section_ids`` collapses the per-lesson section map into a flat,
 * deduplicated list; ``null`` (rather than an empty list) means
 * "include every eligible section for the selected lessons".
 */
export function buildCoverageOptions(
  form: FormState,
  readyLessonIds: string[],
): CoverageOptionsPayload | null {
  if (form.generation_mode !== "coverage") return null;
  const sectionIds = readyLessonIds
    .flatMap((lessonId) => form.selected_section_ids[lessonId] ?? [])
    .filter((value, index, array) => array.indexOf(value) === index);
  return {
    min_per_section: form.coverage_min_per_section,
    max_per_section: form.coverage_max_per_section,
    skip_summaries: form.skip_summaries,
    slides_per_section: form.slides_per_section,
    section_grouping: form.section_grouping,
    section_ids: sectionIds.length > 0 ? sectionIds : null,
  };
}

/**
 * First blocking validation message for a submit attempt, or `null` when the
 * form is submittable. Checks run in the same order the pre-split
 * `handleGenerate` guarded them, so the surfaced toast is unchanged.
 */
export function validateGenerationForm(
  form: FormState,
  context: { selectedLessonCount: number; bloomOverflow: boolean },
): string | null {
  if (context.selectedLessonCount === 0) {
    return "Select at least one source lesson";
  }
  if (form.coverage_min_per_section > form.coverage_max_per_section) {
    return "Min per section cannot exceed max per section";
  }
  if (context.bloomOverflow) {
    return "Bloom distribution exceeds total question count";
  }
  if (form.extra_instructions.length > 1000) {
    return "Extra instructions must be 1000 characters or fewer";
  }
  if (form.question_types.length === 0) {
    return "Pick at least one question type";
  }
  return null;
}

/** The strict FR-5 ``POST /teacher/quizzes/{id}/generate`` body. */
export function buildGeneratePayload(
  form: FormState,
  selectedLessonIds: string[],
  hasExistingQuestions: boolean,
): Record<string, unknown> {
  return {
    question_count: form.question_count,
    question_types: form.question_types,
    difficulty: form.difficulty,
    source_lesson_ids: selectedLessonIds,
    generation_mode: form.generation_mode,
    focus_topics: form.focus_topics,
    avoid_topics: form.avoid_topics,
    extra_instructions: form.extra_instructions.trim() || null,
    append: hasExistingQuestions ? form.append : false,
    coverage_options: buildCoverageOptions(form, selectedLessonIds),
    bloom_distribution: buildBloomDistribution(
      form.bloom_enabled,
      form.bloom_distribution,
    ),
    target_outcome_ids: form.target_outcome_ids,
  };
}
