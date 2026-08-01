/**
 * Rubric-criterion coercion helpers for `supplementary-instructions.ts`.
 *
 * Split out so `parseSupplementaryInstructions` stays a flat shape-check on the
 * stored blob: the unknown-shaped criterion coercion, the two accepted rubric
 * container shapes, and the dedupe/cap loop each own their own branches here.
 */

/** One teacher-defined scoring criterion. Weight is a positive number; the
 * backend normalises the set to sum to 1.0, so relative magnitude is what
 * matters, not the absolute value. Description is optional but is the single
 * biggest lever on judge quality. */
export interface RubricCriterion {
  name: string;
  weight: number;
  description: string;
}

/** Backend caps criteria at 10 and criterion names at 64 chars. Mirror those
 * here so the UI can't build a payload the backend will silently truncate. */
export const MAX_CRITERIA = 10;
export const MAX_CRITERION_NAME_CHARS = 64;

interface StoredCriterion {
  name?: unknown;
  weight?: unknown;
  description?: unknown;
}

function coerceCriterionName(raw: StoredCriterion): string {
  const rawName =
    typeof raw.name === "string"
      ? raw.name
      : typeof (raw as { criterion?: unknown }).criterion === "string"
        ? (raw as { criterion: string }).criterion
        : "";
  return rawName.trim().slice(0, MAX_CRITERION_NAME_CHARS);
}

function coerceCriterionWeight(raw: StoredCriterion): number {
  const weightNum =
    typeof raw.weight === "number"
      ? raw.weight
      : typeof raw.weight === "string"
        ? Number(raw.weight)
        : NaN;
  return Number.isFinite(weightNum) && weightNum > 0 ? weightNum : 1;
}

export function coerceCriterion(entry: unknown): RubricCriterion | null {
  if (typeof entry === "string") {
    const name = entry.trim().slice(0, MAX_CRITERION_NAME_CHARS);
    return name ? { name, weight: 1, description: "" } : null;
  }
  if (!entry || typeof entry !== "object") return null;
  const raw = entry as StoredCriterion;
  const name = coerceCriterionName(raw);
  if (!name) return null;
  const weight = coerceCriterionWeight(raw);
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  return { name, weight, description };
}

/**
 * The `evaluation_rubric` field is stored either as a bare array of criteria or
 * as `{ criteria: [...] }`. Anything else yields no criteria.
 */
export function extractRawCriteria(rubric: unknown): unknown[] {
  if (Array.isArray(rubric)) return rubric;
  if (rubric && typeof rubric === "object") {
    const nested = (rubric as { criteria?: unknown }).criteria;
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

/** Coerce, dedupe by name, and cap the stored criteria at `MAX_CRITERIA`. */
export function collectCriteria(rawCriteria: unknown[]): RubricCriterion[] {
  const seen = new Set<string>();
  const criteria: RubricCriterion[] = [];
  for (const entry of rawCriteria) {
    if (criteria.length >= MAX_CRITERIA) break;
    const criterion = coerceCriterion(entry);
    if (!criterion || seen.has(criterion.name)) continue;
    seen.add(criterion.name);
    criteria.push(criterion);
  }
  return criteria;
}
