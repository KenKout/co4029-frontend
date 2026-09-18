/**
 * The per-program career-path limit, as a form field.
 *
 * A learning program may cap how many of its career paths one student holds,
 * or decline to — in which case the student is bounded by the organization's
 * `max_concurrent_paths_per_student`, counted across every program they are
 * in. Blank in the box means exactly that: no cap of this program's own.
 *
 * Which makes `null` a legitimate ANSWER rather than the "invalid input"
 * signal it used to be, so parsing returns a tagged result: `{ ok: false }`
 * is a typo, `{ value: null }` is a deliberate blank. Collapsing the two is
 * the bug this shape exists to prevent — a blank box would either be rejected
 * as invalid or, worse, saved as some number the manager never typed.
 *
 * Shared by the create and edit pages so the two cannot disagree about what
 * an empty field means.
 */

export type CareerPathLimit = { ok: true; value: number | null } | { ok: false };

export function parseCareerPathLimit(
  value: string,
  ceiling: number,
): CareerPathLimit {
  if (value.trim() === "") return { ok: true, value: null };
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= ceiling
    ? { ok: true, value: parsed }
    : { ok: false };
}

/**
 * What to put in the input for a limit that is already stored.
 *
 * `String(null)` renders the literal text "null", which the parse above would
 * then reject as a typo — so an uncapped program would look broken in its own
 * editor.
 */
export function careerPathLimitToInput(limit: number | null): string {
  return limit === null ? "" : String(limit);
}
