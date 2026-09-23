import { describe, expect, it } from "vitest";

import {
  resolveProgramDraftFields,
  slugify,
} from "../_components/learning-program-new-helpers";

describe("learning program draft fields", () => {
  it("derives a slug and uses the default faculty when state is briefly empty", () => {
    expect(
      resolveProgramDraftFields({
        name: "  Data Science  ",
        slug: "",
        facultyId: "",
        defaultFacultyId: "faculty-default",
      }),
    ).toEqual({
      name: "Data Science",
      slug: "data-science",
      facultyId: "faculty-default",
    });
  });

  it("uses the only available faculty when no default was supplied", () => {
    expect(
      resolveProgramDraftFields({
        name: "IT Senior",
        slug: "it-senior",
        facultyId: "",
        faculties: [{ id: "faculty-only" }],
      }).facultyId,
    ).toBe("faculty-only");
  });

  it("preserves explicitly selected values", () => {
    expect(
      resolveProgramDraftFields({
        name: "Program",
        slug: "custom-program",
        facultyId: "faculty-selected",
        defaultFacultyId: "faculty-default",
      }),
    ).toEqual({
      name: "Program",
      slug: "custom-program",
      facultyId: "faculty-selected",
    });
  });

  it("normalizes Vietnamese names for the generated slug", () => {
    expect(slugify("Lộ trình Kỹ năng mềm")).toBe("lo-trinh-ky-nang-mem");
  });
});
