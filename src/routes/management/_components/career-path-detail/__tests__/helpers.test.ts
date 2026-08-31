import { describe, expect, it } from "vitest";

import { toCourseCandidates } from "../helpers";

/**
 * The candidates endpoint returns only PUBLISHED org courses (user decision
 * 2026-08-30), so these rows are what the picker actually receives. The mapper
 * must not re-introduce a status filter of its own or invent a disabled state.
 */
const catalogue = [
  { id: "c1", title: "Data Structures", slug: "data-structures", status: "published" },
  { id: "c2", title: "Data Mining", slug: "data-mining", status: "published" },
];

describe("toCourseCandidates", () => {
  it("maps every published row to a pickable entity", () => {
    const rows = toCourseCandidates(catalogue, "");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id)).toEqual(["c1", "c2"]);
    // No row is disabled: an unattachable course is never offered at all.
    expect(rows.every((r) => r.selectable === undefined)).toBe(true);
    expect(rows.every((r) => r.notSelectableReason === undefined)).toBe(true);
  });

  it("filters by title and by slug, keeping the status badge", () => {
    expect(toCourseCandidates(catalogue, "mining").map((r) => r.id)).toEqual([
      "c2",
    ]);
    expect(
      toCourseCandidates(catalogue, "data-structures").map((r) => r.id),
    ).toEqual(["c1"]);
    expect(toCourseCandidates(catalogue, "")[0].status).toBe("published");
  });

  it("handles an absent catalogue without throwing", () => {
    expect(toCourseCandidates(undefined, "")).toEqual([]);
  });
});
