import { describe, expect, it } from "vitest";

import {
  facultyRoleCodes,
  isFacultyDean,
} from "../UnitContentsPanel";
import {
  peopleForFaculty,
  type UnitPerson,
} from "../use-unit-assignment";

function person(overrides: Partial<UnitPerson>): UnitPerson {
  return {
    membershipId: "membership-1",
    userId: "user-1",
    displayName: "Demo user",
    email: "demo@example.com",
    facultyIds: [],
    roleCodesByFaculty: {},
    roles: [],
    ...overrides,
  };
}

describe("Faculty role visibility", () => {
  it("keeps a hod-only account visible in the Faculty roster", () => {
    const dean = person({
      facultyIds: ["faculty-cse"],
      roleCodesByFaculty: { "faculty-cse": ["hod"] },
      roles: ["hod"],
    });

    expect(peopleForFaculty([dean], "faculty-cse")).toEqual([dean]);
    expect(isFacultyDean(dean, "faculty-cse")).toBe(true);
  });

  it("distinguishes affiliation from Dean authority per Faculty", () => {
    const multiFacultyTeacher = person({
      facultyIds: ["faculty-cse", "faculty-data"],
      roleCodesByFaculty: { "faculty-cse": ["hod"] },
      roles: ["hod", "teacher"],
    });

    expect(isFacultyDean(multiFacultyTeacher, "faculty-cse")).toBe(true);
    expect(isFacultyDean(multiFacultyTeacher, "faculty-data")).toBe(false);
    expect(facultyRoleCodes(multiFacultyTeacher, "faculty-cse")).toEqual([
      "hod",
      "teacher",
    ]);
    expect(facultyRoleCodes(multiFacultyTeacher, "faculty-data")).toEqual([
      "teacher",
    ]);
  });

  it("does not mistake an organization-scoped hod role for a Faculty Dean", () => {
    const masterDean = person({
      facultyIds: ["faculty-cse"],
      roles: ["hod"],
    });

    expect(isFacultyDean(masterDean, "faculty-cse")).toBe(false);
    expect(facultyRoleCodes(masterDean, "faculty-cse")).toEqual([]);
  });
});
