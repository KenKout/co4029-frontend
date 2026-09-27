import { describe, expect, it } from "vitest";

import {
  ROLE_SWITCHER_ROLES,
  roleForSwitcherPath,
} from "../role-switcher";

describe("roleForSwitcherPath", () => {
  it.each([
    ["/dashboard", "student"],
    ["/courses/intro-to-python/learn/lesson-1", "student"],
    ["/me/progress", "student"],
    ["/teacher/courses", "teacher"],
    ["/management/users", "manager"],
    ["/admin/users", "admin"],
  ] as const)("highlights %s as %s", (pathname, expected) => {
    expect(roleForSwitcherPath(pathname, ROLE_SWITCHER_ROLES)).toBe(expected);
  });

  it("keeps the student highlight on nested routes for multi-role users", () => {
    expect(
      roleForSwitcherPath("/courses/my-course/learn/lesson-1", [
        "student",
        "teacher",
        "admin",
      ]),
    ).toBe("student");
  });

  it("does not match a shared route or a similarly named route", () => {
    expect(roleForSwitcherPath("/notifications", ROLE_SWITCHER_ROLES)).toBe(
      undefined,
    );
    expect(roleForSwitcherPath("/courses-old", ROLE_SWITCHER_ROLES)).toBe(
      undefined,
    );
  });
});
