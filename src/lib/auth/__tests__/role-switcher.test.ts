import { describe, expect, it } from "vitest";

import {
  ROLE_SWITCHER_ROLES,
  rolesForSwitcher,
} from "../role-switcher";

describe("rolesForSwitcher", () => {
  it("shows every role the user actually holds", () => {
    expect(rolesForSwitcher(["manager", "teacher"])).toEqual([
      "teacher",
      "manager",
    ]);
  });

  it("keeps dean and manager assignments separate for multi-role admins", () => {
    expect(rolesForSwitcher(["admin", "hod", "manager"])).toEqual([
      "manager",
      "hod",
      "admin",
    ]);
  });

  it("ignores unknown roles and does not infer roles from permissions", () => {
    expect(rolesForSwitcher(["system.administer", "course.create"])).toEqual(
      [],
    );
  });

  it("uses a stable order regardless of API assignment order", () => {
    expect(rolesForSwitcher(["admin", "student", "teacher"])).toEqual([
      "student",
      "teacher",
      "admin",
    ]);
    expect(ROLE_SWITCHER_ROLES).toEqual([
      "student",
      "teacher",
      "manager",
      "hod",
      "admin",
    ]);
  });
});
