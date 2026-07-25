import { describe, expect, it } from "vitest";

import {
  MAX_CRITERIA,
  parseSupplementaryInstructions,
  serializeSupplementaryInstructions,
} from "../supplementary-instructions";

describe("parseSupplementaryInstructions", () => {
  it("treats plain prose as notes with no criteria", () => {
    const result = parseSupplementaryInstructions(
      "Focus on real-world scenarios.",
    );
    expect(result).toEqual({
      notes: "Focus on real-world scenarios.",
      criteria: [],
    });
  });

  it("returns empty for null / blank", () => {
    expect(parseSupplementaryInstructions(null)).toEqual({
      notes: "",
      criteria: [],
    });
    expect(parseSupplementaryInstructions("   ")).toEqual({
      notes: "",
      criteria: [],
    });
  });

  it("reads notes + criteria from the JSON object form", () => {
    const raw = JSON.stringify({
      notes: "Prioritise applied questions.",
      evaluation_rubric: {
        criteria: [
          { name: "depth", weight: 3, description: "Cites evidence." },
          { name: "clarity", weight: 1 },
        ],
      },
    });
    const result = parseSupplementaryInstructions(raw);
    expect(result.notes).toBe("Prioritise applied questions.");
    expect(result.criteria).toEqual([
      { name: "depth", weight: 3, description: "Cites evidence." },
      { name: "clarity", weight: 1, description: "" },
    ]);
  });

  it("accepts the bare-array rubric form", () => {
    const raw = JSON.stringify({ evaluation_rubric: ["depth", "clarity"] });
    const result = parseSupplementaryInstructions(raw);
    expect(result.criteria).toEqual([
      { name: "depth", weight: 1, description: "" },
      { name: "clarity", weight: 1, description: "" },
    ]);
  });

  it("falls back to prose when the JSON is malformed", () => {
    const raw = '{"notes": "unterminated';
    const result = parseSupplementaryInstructions(raw);
    expect(result.notes).toBe(raw);
    expect(result.criteria).toEqual([]);
  });

  it("drops duplicate criterion names, keeping the first", () => {
    const raw = JSON.stringify({
      evaluation_rubric: {
        criteria: [
          { name: "depth", weight: 2 },
          { name: "depth", weight: 5 },
        ],
      },
    });
    const result = parseSupplementaryInstructions(raw);
    expect(result.criteria).toHaveLength(1);
    expect(result.criteria[0].weight).toBe(2);
  });

  it("caps the criteria count", () => {
    const raw = JSON.stringify({
      evaluation_rubric: {
        criteria: Array.from({ length: 25 }, (_, i) => ({
          name: `c_${i}`,
          weight: 1,
        })),
      },
    });
    expect(parseSupplementaryInstructions(raw).criteria).toHaveLength(
      MAX_CRITERIA,
    );
  });
});

describe("serializeSupplementaryInstructions", () => {
  it("returns null when there is nothing to store", () => {
    expect(
      serializeSupplementaryInstructions({ notes: "", criteria: [] }),
    ).toBeNull();
    expect(
      serializeSupplementaryInstructions({ notes: "   ", criteria: [] }),
    ).toBeNull();
  });

  it("stores prose-only config as a raw string (no JSON wrapper)", () => {
    const out = serializeSupplementaryInstructions({
      notes: "Avoid rote recall.",
      criteria: [],
    });
    expect(out).toBe("Avoid rote recall.");
  });

  it("upgrades to JSON once a criterion exists", () => {
    const out = serializeSupplementaryInstructions({
      notes: "Applied only.",
      criteria: [{ name: "depth", weight: 3, description: "Cites evidence." }],
    });
    expect(out).not.toBeNull();
    const parsed = JSON.parse(out as string);
    expect(parsed).toEqual({
      evaluation_rubric: {
        criteria: [{ name: "depth", weight: 3, description: "Cites evidence." }],
      },
      notes: "Applied only.",
    });
  });

  it("omits empty descriptions and empty notes from the payload", () => {
    const out = serializeSupplementaryInstructions({
      notes: "",
      criteria: [{ name: "depth", weight: 2, description: "" }],
    });
    const parsed = JSON.parse(out as string);
    expect(parsed).toEqual({
      evaluation_rubric: { criteria: [{ name: "depth", weight: 2 }] },
    });
    expect(parsed.notes).toBeUndefined();
  });

  it("drops invalid criteria (blank name / non-positive weight)", () => {
    const out = serializeSupplementaryInstructions({
      notes: "",
      criteria: [
        { name: "  ", weight: 3, description: "" },
        { name: "depth", weight: 0, description: "" },
        { name: "clarity", weight: 2, description: "" },
      ],
    });
    const parsed = JSON.parse(out as string);
    expect(parsed.evaluation_rubric.criteria).toEqual([
      { name: "clarity", weight: 2 },
    ]);
  });

  it("round-trips through parse", () => {
    const original = JSON.stringify({
      notes: "Applied only.",
      evaluation_rubric: {
        criteria: [
          { name: "depth", weight: 3, description: "Cites evidence." },
          { name: "clarity", weight: 1 },
        ],
      },
    });
    const reserialized = serializeSupplementaryInstructions(
      parseSupplementaryInstructions(original),
    );
    expect(parseSupplementaryInstructions(reserialized)).toEqual(
      parseSupplementaryInstructions(original),
    );
  });
});
