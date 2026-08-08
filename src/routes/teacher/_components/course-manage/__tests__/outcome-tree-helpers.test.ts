import { describe, expect, it } from "vitest";
import {
  childCount,
  nextSibling,
  prevRow,
  prevSibling,
  siblingsOf,
} from "../use-outcome-tree-actions";
import type { CourseOutcome } from "../types";

/** Minimal outcome rows for pure helper tests. */
function row(
  id: string,
  parentId: string | null,
  position: number,
  depth = 0,
): CourseOutcome {
  return {
    id,
    parent_id: parentId,
    position,
    outcome_text: id,
    course_id: "c",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    depth,
    code: String(position),
  } as CourseOutcome;
}

const tree: CourseOutcome[] = [
  row("a", null, 1, 0), // A
  row("a1", "a", 1, 1), //   A.1
  row("a2", "a", 2, 1), //   A.2
  row("b", null, 2, 0), // B
  row("c", null, 3, 0), // C
];

describe("siblingsOf", () => {
  it("groups by parent, in tree order", () => {
    expect(siblingsOf(tree, null).map((o) => o.id)).toEqual(["a", "b", "c"]);
    expect(siblingsOf(tree, "a").map((o) => o.id)).toEqual(["a1", "a2"]);
  });
});

describe("prevRow", () => {
  it("returns the immediately preceding row at any depth", () => {
    expect(prevRow(tree, tree[1])?.id).toBe("a"); // before a1 -> a
    expect(prevRow(tree, tree[2])?.id).toBe("a1"); // before a2 -> a1
    expect(prevRow(tree, tree[4])?.id).toBe("b"); // before c -> b
  });
  it("returns null for the first row", () => {
    expect(prevRow(tree, tree[0])).toBeNull();
  });
});

describe("prevSibling / nextSibling", () => {
  it("moves within the same parent only", () => {
    expect(prevSibling(tree, tree[0])).toBeNull(); // a has no sibling above
    expect(nextSibling(tree, tree[0])?.id).toBe("b");
    expect(prevSibling(tree, tree[3])?.id).toBe("a"); // b's previous sibling is a
    expect(nextSibling(tree, tree[3])?.id).toBe("c");
    expect(nextSibling(tree, tree[4])).toBeNull(); // c is last
    expect(prevSibling(tree, tree[2])?.id).toBe("a1"); // within A's children
    expect(nextSibling(tree, tree[2])).toBeNull();
  });
});

describe("childCount", () => {
  it("counts immediate children only", () => {
    expect(childCount(tree, tree[0])).toBe(2); // a has a1, a2
    expect(childCount(tree, tree[1])).toBe(0); // a1 is a leaf
    expect(childCount(tree, tree[3])).toBe(0); // b is a leaf
  });
});
