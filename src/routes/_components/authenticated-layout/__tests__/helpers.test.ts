import { describe, expect, it } from "vitest";

import {
  resolveDefaultRole,
  resolveNavGroups,
  resolveRole,
} from "../helpers";
import {
  adminNavGroups,
  managerNavGroups,
  studentNavGroups,
  teacherNavGroups,
} from "@/lib/navigation";

describe("shared-route sidebar context", () => {
  it.each([
    ["admin", ["system.administer"], adminNavGroups],
    ["manager", ["course.assign_teacher"], managerNavGroups],
    ["teacher", ["lesson.manage"], teacherNavGroups],
    ["student", [], studentNavGroups],
  ] as const)(
    "keeps the %s navigation on /notifications",
    (expectedRole, permissions, expectedGroups) => {
      const defaultRole = resolveDefaultRole(permissions);
      const sharedSection = {
        isAllowed: true,
        onAdminPath: false,
        onManagerPath: false,
        onTeacherPath: false,
        defaultRole,
      };

      expect(resolveRole(sharedSection)).toBe(expectedRole);
      expect(resolveNavGroups(sharedSection)).toBe(expectedGroups);
    },
  );

  it("prefers manager over teacher when permissions overlap", () => {
    expect(
      resolveDefaultRole(["course.assign_teacher", "course.create"]),
    ).toBe("manager");
  });
});
