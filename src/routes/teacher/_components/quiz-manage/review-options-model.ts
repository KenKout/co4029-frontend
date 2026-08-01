import type { ReviewOptions } from "@/lib/api/hooks/quizzes";

/**
 * Data model behind the review-visibility editor: the 3 time-windows, the 5
 * per-window flags, and the named preset matrices. Extracted from
 * ReviewOptionsMatrix so the presets row and the per-window cards can share it
 * without importing back from the component that renders them.
 */

export type ReviewWindowFlags = ReviewOptions["immediately_after"];

export const WINDOW_KEYS = [
  "immediately_after",
  "later_while_open",
  "after_close",
] as const;

export const FLAG_KEYS = [
  "show_score",
  "show_correctness",
  "show_correct_answers",
  "show_explanation",
  "show_points",
] as const;

export type WindowKey = (typeof WINDOW_KEYS)[number];
export type FlagKey = (typeof FLAG_KEYS)[number];

export function flags(on: boolean): ReviewWindowFlags {
  return {
    show_score: on,
    show_correctness: on,
    show_correct_answers: on,
    show_explanation: on,
    show_points: on,
  };
}

/** All-true default matrix (preserves historical always-show behaviour). */
export function defaultReviewOptions(): ReviewOptions {
  return {
    immediately_after: flags(true),
    later_while_open: flags(true),
    after_close: flags(true),
  };
}

/**
 * Named shortcuts for the matrix shapes teachers actually ask for. Each is a
 * complete matrix, so applying one is predictable — it never merges with
 * whatever was set before.
 */
export const PRESETS = {
  everything: (): ReviewOptions => ({
    immediately_after: flags(true),
    later_while_open: flags(true),
    after_close: flags(true),
  }),
  score_now_rest_after_close: (): ReviewOptions => ({
    immediately_after: { ...flags(false), show_score: true },
    later_while_open: { ...flags(false), show_score: true },
    after_close: flags(true),
  }),
  nothing_until_close: (): ReviewOptions => ({
    immediately_after: flags(false),
    later_while_open: flags(false),
    after_close: flags(true),
  }),
  nothing: (): ReviewOptions => ({
    immediately_after: flags(false),
    later_while_open: flags(false),
    after_close: flags(false),
  }),
} as const;

export type PresetKey = keyof typeof PRESETS;
export const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

function sameMatrix(a: ReviewOptions, b: ReviewOptions) {
  return WINDOW_KEYS.every((win) =>
    FLAG_KEYS.every((flag) => a[win][flag] === b[win][flag]),
  );
}

/** Which preset (if any) the current value already matches. */
export function matchPreset(value: ReviewOptions): PresetKey | null {
  return PRESET_KEYS.find((key) => sameMatrix(value, PRESETS[key]())) ?? null;
}
