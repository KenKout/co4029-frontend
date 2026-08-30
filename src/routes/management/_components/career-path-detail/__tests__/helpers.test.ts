import { describe, expect, it } from "vitest";

import { toCourseCandidates } from "../helpers";

const catalogue = [
  { id: "c1", title: "Data Structures", slug: "data-structures", status: "published" },
  { id: "c2", title: "Data Mining", slug: "data-mining", status: "draft" },
  { id: "c3", title: "Old Course", slug: "old-course", status: "archived" },
];

describe("toCourseCandidates", () => {
  it("leaves every row pickable for a DRAFT path", () => {
    const rows = toCourseCandidates(catalogue, "");
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.selectable)).toBe(true);
    expect(rows.every((r) => r.notSelectableReason === null)).toBe(true);
  });

  it("disables non-published rows for a PUBLISHED path, without hiding them", () => {
    const rows = toCourseCandidates(catalogue, "", true);
    // Visible, so the manager sees WHY rather than "where did it go?".
    expect(rows).toHaveLength(3);
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get("c1")?.selectable).toBe(true);
    expect(byId.get("c1")?.notSelectableReason).toBeNull();
    for (const id of ["c2", "c3"]) {
      expect(byId.get(id)?.selectable).toBe(false);
      expect(byId.get(id)?.notSelectableReason).toBe("course_not_published");
    }
  });

  it("still filters by title/slug and keeps the status badge", () => {
    const rows = toCourseCandidates(catalogue, "mining", true);
    expect(rows.map((r) => r.id)).toEqual(["c2"]);
    expect(rows[0].status).toBe("draft");
    expect(rows[0].selectable).toBe(false);
  });
});
