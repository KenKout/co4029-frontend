/**
 * Serialize / parse the interview config's `supplementary_instructions` field.
 *
 * That one free-text column carries two things from the teacher:
 *  - **notes** — free prose guidance injected verbatim into the question
 *    GENERATION prompt.
 *  - **evaluation_rubric** — the structured SCORING rubric the judge grades
 *    each answer against (criterion name + weight + optional description).
 *
 * To stay backwards-compatible, a config that only has prose is stored as the
 * raw string (NOT wrapped in JSON). The moment a rubric criterion exists we
 * upgrade to a JSON object `{ notes, evaluation_rubric: { criteria: [...] } }`.
 * The backend mirrors this exact shape — see
 * `ai/stages/evaluation/rubric.py::resolve_rubric_definition` /
 * `resolve_supplementary_notes`.
 *
 * Keys deliberately match the backend:
 *  - `notes`             → prose for the generation prompt.
 *  - `evaluation_rubric` → scoring rubric. NOT `rubric_weights`: that key is
 *    already claimed by the generation stage for the question TYPE MIX
 *    (technical/behavioral/situational), so reusing it would grade candidates
 *    against criteria literally named "technical"/"behavioral".
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

export interface SupplementaryInstructions {
  /** Free prose guidance for the generation prompt. */
  notes: string;
  /** Scoring rubric criteria. Empty = grade on the backend's 4-criterion default. */
  criteria: RubricCriterion[];
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

function coerceCriterion(entry: unknown): RubricCriterion | null {
  if (typeof entry === "string") {
    const name = entry.trim().slice(0, MAX_CRITERION_NAME_CHARS);
    return name ? { name, weight: 1, description: "" } : null;
  }
  if (!entry || typeof entry !== "object") return null;
  const raw = entry as StoredCriterion;
  const rawName =
    typeof raw.name === "string"
      ? raw.name
      : typeof (raw as { criterion?: unknown }).criterion === "string"
        ? (raw as { criterion: string }).criterion
        : "";
  const name = rawName.trim().slice(0, MAX_CRITERION_NAME_CHARS);
  if (!name) return null;
  const weightNum =
    typeof raw.weight === "number"
      ? raw.weight
      : typeof raw.weight === "string"
        ? Number(raw.weight)
        : NaN;
  const weight = Number.isFinite(weightNum) && weightNum > 0 ? weightNum : 1;
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  return { name, weight, description };
}

/**
 * Parse the stored `supplementary_instructions` string into the editable
 * structure. Prose-only fields (the common case, and every legacy config)
 * parse into `{ notes: <the prose>, criteria: [] }`. Malformed JSON falls back
 * to treating the whole string as prose so a teacher never loses their text.
 */
export function parseSupplementaryInstructions(
  raw: string | null | undefined,
): SupplementaryInstructions {
  const value = (raw ?? "").trim();
  if (!value || !value.startsWith("{")) {
    return { notes: value, criteria: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    // Not valid JSON — treat the whole thing as prose (don't destroy input).
    return { notes: value, criteria: [] };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { notes: value, criteria: [] };
  }
  const obj = parsed as { notes?: unknown; evaluation_rubric?: unknown };
  const notes = typeof obj.notes === "string" ? obj.notes : "";

  let rawCriteria: unknown[] = [];
  const rubric = obj.evaluation_rubric;
  if (Array.isArray(rubric)) {
    rawCriteria = rubric;
  } else if (rubric && typeof rubric === "object") {
    const nested = (rubric as { criteria?: unknown }).criteria;
    if (Array.isArray(nested)) rawCriteria = nested;
  }

  const seen = new Set<string>();
  const criteria: RubricCriterion[] = [];
  for (const entry of rawCriteria) {
    if (criteria.length >= MAX_CRITERIA) break;
    const criterion = coerceCriterion(entry);
    if (!criterion || seen.has(criterion.name)) continue;
    seen.add(criterion.name);
    criteria.push(criterion);
  }

  return { notes, criteria };
}

/**
 * Serialize the editable structure back into the string the API expects.
 *
 * Returns `null` when there is nothing to store (so the column goes NULL).
 * Returns the raw prose string when there are no criteria (backwards-compatible
 * — a prose-only config is never wrapped in JSON). Only upgrades to a JSON
 * object once at least one valid criterion exists.
 */
export function serializeSupplementaryInstructions(
  value: SupplementaryInstructions,
): string | null {
  const notes = value.notes.trim();
  const criteria = value.criteria
    .map((c) => ({
      name: c.name.trim().slice(0, MAX_CRITERION_NAME_CHARS),
      weight: c.weight,
      description: c.description.trim(),
    }))
    .filter(
      (c) => c.name.length > 0 && Number.isFinite(c.weight) && c.weight > 0,
    )
    .slice(0, MAX_CRITERIA);

  if (criteria.length === 0) {
    return notes || null;
  }

  const payload: {
    notes?: string;
    evaluation_rubric: { criteria: RubricCriterion[] };
  } = {
    evaluation_rubric: {
      criteria: criteria.map((c) => ({
        name: c.name,
        weight: c.weight,
        // Omit empty descriptions from the wire to keep the blob tidy.
        ...(c.description ? { description: c.description } : {}),
      })) as RubricCriterion[],
    },
  };
  if (notes) payload.notes = notes;

  return JSON.stringify(payload);
}
