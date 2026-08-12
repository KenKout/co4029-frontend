/**
 * Shared helpers for the admin content-analytics breakdowns (ring charts).
 *
 * `readBucket` pulls the label + count out of one breakdown bucket. The
 * admin stats endpoint returns `list[dict[str, Any]]` per breakdown, and the
 * label key differs by query: `courses_by_status` and
 * `processing_jobs_by_status` use `status`, while `materials_by_type` uses
 * `material_type`. The old fixed list (`status`/`type`/`kind`/`name`) missed
 * `material_type` — `"type" !== "material_type"` — so every material row
 * rendered its label as "—" while the counts came through fine.
 *
 * Rather than extend the guess list and hit this again on the next
 * breakdown, fall back to "the first string value that isn't the count". A
 * bucket is only ever {label-ish, count}, so that generalises to any new
 * breakdown the backend adds.
 */
export type BreakdownBucket = { [key: string]: unknown };

export function readBucket(bucket: BreakdownBucket): {
  label: string;
  count: unknown;
} {
  const COUNT_KEYS = ["count", "total", "n"];
  const countKey = COUNT_KEYS.find(
    (k) => k in bucket && typeof bucket[k] === "number",
  );
  // Preferred keys first (stable ordering when a bucket has several
  // strings), then any remaining string field.
  const labelKey =
    ["status", "type", "material_type", "kind", "name"].find(
      (k) => k in bucket && typeof bucket[k] === "string",
    ) ??
    Object.keys(bucket).find(
      (k) => !COUNT_KEYS.includes(k) && typeof bucket[k] === "string",
    );
  return {
    label: labelKey ? String(bucket[labelKey]) : "—",
    count: countKey ? bucket[countKey] : "—",
  };
}

/**
 * Categorical palette for the ring segments, drawn from the app's M3 CSS
 * variables so the chart follows light/dark theming. Cycles modulo the
 * number of segments; the first four (primary/secondary/tertiary/error)
 * are the distinct anchors for the status/type breakdowns.
 */
export const RING_PALETTE = [
  "var(--color-m3-primary)",
  "var(--color-m3-secondary)",
  "var(--color-m3-tertiary)",
  "var(--color-m3-error)",
  "var(--color-m3-primary-fixed-dim)",
  "var(--color-m3-secondary-fixed-dim)",
  "var(--color-m3-tertiary-fixed-dim)",
  "var(--color-m3-outline)",
];
