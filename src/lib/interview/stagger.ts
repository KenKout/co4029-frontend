/**
 * Staggered-entrance delays for interview surfaces.
 *
 * The same `Math.min(index, cap) * step` expression had been hand-copied into
 * three files (`interview-config.tsx:1545`, `adaptive-readiness-panel.tsx:294`,
 * `learning-outcomes.tsx:368`), each with its own cap and step. Collecting the
 * two established rhythms here keeps a list on the student side from settling
 * at a visibly different speed than the same kind of list on the teacher side.
 *
 * Why the cap matters: without one, the last row of a 40-item list would wait
 * 1.6s before appearing. Capping means a long list still finishes inside a few
 * hundred milliseconds while a short one keeps a readable cascade.
 *
 * Motion here is CSS-only. Reduced motion is handled globally in `app.css` by a
 * rule that forces every animation to 0.01ms, so a delay returned by this
 * module simply never becomes visible — no per-call-site gating needed.
 */

/** Cards and tiles: fewer, larger elements, so a slower beat reads better. */
const CARD_STEP_MS = 60;
const CARD_CAP = 5;

/** List rows: more, smaller elements, so a tighter beat keeps the list snappy. */
const ROW_STEP_MS = 40;
const ROW_CAP = 8;

function delay(index: number, step: number, cap: number): number {
  if (!Number.isFinite(index) || index <= 0) return 0;
  return Math.min(Math.floor(index), cap) * step;
}

/**
 * Delay in ms for the nth card/tile in a group. 60ms steps, capped at 5
 * (≤300ms). Matches `adaptive-readiness-panel.tsx`.
 */
export function cardStaggerMs(index: number): number {
  return delay(index, CARD_STEP_MS, CARD_CAP);
}

/**
 * Delay in ms for the nth row in a list. 40ms steps, capped at 8 (≤320ms).
 * Matches `learning-outcomes.tsx`.
 */
export function rowStaggerMs(index: number): number {
  return delay(index, ROW_STEP_MS, ROW_CAP);
}

/** Ready-to-spread inline style, so call sites do not rebuild the template. */
export function cardStaggerStyle(index: number): { animationDelay: string } {
  return { animationDelay: `${cardStaggerMs(index)}ms` };
}

export function rowStaggerStyle(index: number): { animationDelay: string } {
  return { animationDelay: `${rowStaggerMs(index)}ms` };
}
