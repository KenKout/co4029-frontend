import { describe, expect, it } from "vitest";

import {
  resolveDefaultRole,
  resolveIsAllowed,
  resolveNavGroups,
  resolveRole,
  resolveSectionFlags,
} from "../helpers";
import {
  adminNavGroups,
  managerNavGroups,
  studentNavGroups,
  teacherNavGroups,
} from "@/lib/navigation";

describe("shared-route sidebar context", () => {
  it.each([
    ["admin", ["admin"], ["system.administer"], adminNavGroups],
    ["manager", ["manager"], ["course.assign_teacher"], managerNavGroups],
    ["teacher", ["teacher"], ["lesson.manage"], teacherNavGroups],
    ["student", ["student"], [], studentNavGroups],
  ] as const)(
    "keeps the %s navigation on /notifications",
    (expectedRole, roles, permissions, expectedGroups) => {
      const defaultRole = resolveDefaultRole(roles, permissions);
      const sharedSection = {
        isAllowed: true,
        onAdminPath: false,
        onManagerPath: false,
        onTeacherPath: false,
        onStudentPath: false,
        roles,
        defaultRole,
      };

      expect(resolveRole(sharedSection)).toBe(expectedRole);
      expect(resolveNavGroups(sharedSection)).toBe(expectedGroups);
    },
  );

  it("prefers manager over teacher when permissions overlap", () => {
    expect(
      resolveDefaultRole(
        ["teacher", "manager"],
        ["course.assign_teacher", "course.create"],
      ),
    ).toBe("manager");
  });

  it("requires the matching role assignment, not just a higher role's permissions", () => {
    const flags = resolveSectionFlags("/teacher/courses");
    const adminPermissions = ["system.administer", "course.create"];

    expect(
      resolveIsAllowed({
        ...flags,
        permsReady: true,
        rolesReady: true,
        perms: adminPermissions,
        roles: ["admin"],
      }),
    ).toBe(false);

    expect(
      resolveIsAllowed({
        ...flags,
        permsReady: true,
        rolesReady: true,
        perms: adminPermissions,
        roles: ["admin", "teacher"],
      }),
    ).toBe(true);
  });

  it("allows an admin into management only when manager or dean is also assigned", () => {
    const flags = resolveSectionFlags("/management/learning-programs");
    const adminPermissions = [
      "system.administer",
      "course.assign_teacher",
      "learning_program.manage",
    ];

    expect(
      resolveIsAllowed({
        ...flags,
        permsReady: true,
        rolesReady: true,
        perms: adminPermissions,
        roles: ["admin"],
      }),
    ).toBe(false);

    expect(
      resolveIsAllowed({
        ...flags,
        permsReady: true,
        rolesReady: true,
        perms: adminPermissions,
        roles: ["admin", "manager"],
      }),
    ).toBe(true);

    expect(
      resolveIsAllowed({
        ...flags,
        permsReady: true,
        rolesReady: true,
        perms: adminPermissions,
        roles: ["admin", "hod"],
      }),
    ).toBe(true);
  });

  it("uses the student sidebar on /dashboard when an admin also has student", () => {
    const flags = resolveSectionFlags("/dashboard");
    const section = {
      ...flags,
      isAllowed: true,
      roles: ["admin", "student"],
      defaultRole: resolveDefaultRole(["admin", "student"], ["system.administer"]),
    };

    expect(resolveNavGroups(section)).toBe(studentNavGroups);
    expect(resolveRole(section)).toBe("student");
  });
});
