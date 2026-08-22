import { describe, expect, it } from "vitest";
import { collectTreeIds, filterTree } from "../tree-filter";

interface Node {
  id: string;
  name: string;
  children: Node[];
}

const n = (id: string, name: string, children: Node[] = []): Node => ({
  id,
  name,
  children,
});

/** Engineering → { Computer Science → AI Program, Electrical }, Business */
const TREE: Node[] = [
  n("fac", "Engineering", [
    n("cse", "Computer Science", [n("ai", "AI Program")]),
    n("ee", "Electrical"),
  ]),
  n("biz", "Business"),
];

const prune = (needle: string) =>
  filterTree<Node>(
    TREE,
    (x) => x.children,
    (x, children) => ({ ...x, children }),
    (x) => x.name.toLowerCase().includes(needle.toLowerCase()),
  );

const names = (nodes: Node[]): string[] =>
  nodes.flatMap((x) => [x.name, ...names(x.children)]);

describe("filterTree", () => {
  it("keeps the ancestor chain of a deep match", () => {
    // The whole point: "Computer Science" lives under "Engineering", which
    // does NOT match. A flat filter over roots would drop it entirely.
    const out = prune("Computer Science");
    expect(names(out)).toEqual(["Engineering", "Computer Science", "AI Program"]);
  });

  it("keeps a matching node's entire subtree", () => {
    // Having found Engineering, the user wants to see what is inside it —
    // not only the descendants that happen to match the same string.
    const out = prune("Engineering");
    expect(names(out)).toEqual([
      "Engineering",
      "Computer Science",
      "AI Program",
      "Electrical",
    ]);
  });

  it("drops branches with no match anywhere", () => {
    const out = prune("Electrical");
    expect(names(out)).toEqual(["Engineering", "Electrical"]);
    expect(names(out)).not.toContain("Business");
    expect(names(out)).not.toContain("Computer Science");
  });

  it("matches a root without pulling in unrelated siblings", () => {
    expect(names(prune("Business"))).toEqual(["Business"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(prune("zzz")).toEqual([]);
  });

  it("does not mutate the input tree", () => {
    const before = JSON.stringify(TREE);
    prune("AI");
    expect(JSON.stringify(TREE)).toBe(before);
  });

  it("finds a leaf two levels down", () => {
    expect(names(prune("AI Program"))).toEqual([
      "Engineering",
      "Computer Science",
      "AI Program",
    ]);
  });
});

describe("collectTreeIds", () => {
  it("returns every id so a filtered tree can be auto-expanded", () => {
    const ids = collectTreeIds(TREE, (x) => x.children, (x) => x.id);
    expect(ids.sort()).toEqual(["ai", "biz", "cse", "ee", "fac"]);
  });

  it("covers only the surviving nodes after a prune", () => {
    const ids = collectTreeIds(prune("Electrical"), (x) => x.children, (x) => x.id);
    expect(ids.sort()).toEqual(["ee", "fac"]);
  });
});
