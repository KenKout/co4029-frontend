import { describe, expect, it } from "vitest";

import type { LearningProgram } from "@/lib/api/types";
import { filterManagedLearningPrograms } from "../learning-programs";

function program(
  id: string,
  status: LearningProgram["status"],
  name: string,
): LearningProgram {
  return { id, status, name, slug: name.toLowerCase().replace(/ /g, "-") } as LearningProgram;
}

describe("filterManagedLearningPrograms", () => {
  const programs = [
    program("draft-1", "draft", "Draft Program"),
    program("published-1", "published", "Published Program"),
    program("archived-1", "archived", "Archived Program"),
  ];

  it("hides archived programs by default", () => {
    expect(filterManagedLearningPrograms(programs, "").map((p) => p.id)).toEqual([
      "draft-1",
      "published-1",
    ]);
  });

  it("reveals archived programs when Archived is selected", () => {
    expect(
      filterManagedLearningPrograms(programs, "", "archived").map((p) => p.id),
    ).toEqual(["archived-1"]);
  });

  it("combines status and search filters", () => {
    expect(
      filterManagedLearningPrograms(programs, "published", "published").map(
        (p) => p.id,
      ),
    ).toEqual(["published-1"]);
  });
});
