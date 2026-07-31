import { describe, expect, it } from "vitest";
import {
  SUPERUSER_PERMISSION,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "@/lib/auth/use-permissions";

describe("permission helpers", () => {
  const perms = ["course.create", "course.update"];

  describe("hasPermission", () => {
    it("is true when the exact permission is held", () => {
      expect(hasPermission(perms, "course.create")).toBe(true);
    });
    it("is false when it is not held", () => {
      expect(hasPermission(perms, "course.delete")).toBe(false);
    });
    it("does NOT implicitly grant via the superuser permission", () => {
      // Behaviour-preserving: a literal check for course.create must stay
      // literal. Superuser bypass is opt-in at the call site, not baked in.
      expect(hasPermission([SUPERUSER_PERMISSION], "course.create")).toBe(
        false,
      );
    });
  });

  describe("hasAnyPermission", () => {
    it("is true when at least one is held", () => {
      expect(hasAnyPermission(perms, ["course.delete", "course.update"])).toBe(
        true,
      );
    });
    it("is false when none are held", () => {
      expect(hasAnyPermission(perms, ["course.delete", "x.y"])).toBe(false);
    });
    it("is false for an empty required list", () => {
      expect(hasAnyPermission(perms, [])).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    it("is true only when every one is held", () => {
      expect(hasAllPermissions(perms, ["course.create", "course.update"])).toBe(
        true,
      );
      expect(hasAllPermissions(perms, ["course.create", "course.delete"])).toBe(
        false,
      );
    });
    it("is vacuously true for an empty required list", () => {
      expect(hasAllPermissions(perms, [])).toBe(true);
    });
  });
});
