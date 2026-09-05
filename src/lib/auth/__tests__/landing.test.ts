import { describe, expect, it } from "vitest";

import {
  DEFAULT_LANDING,
  highestRole,
  landingPathForRoles,
  ROLE_PRECEDENCE,
} from "../landing";

describe("landingPathForRoles", () => {
  it("sends each single role to its own default page", () => {
    expect(landingPathForRoles(["student"])).toBe("/dashboard");
    expect(landingPathForRoles(["teacher"])).toBe("/teacher");
    expect(landingPathForRoles(["manager"])).toBe("/management");
    expect(landingPathForRoles(["hod"])).toBe("/management");
    expect(landingPathForRoles(["admin"])).toBe("/admin/stats");
  });

  it("takes the highest role when a user holds several", () => {
    // Order in the array must not matter — precedence is the table's, not the
    // caller's.
    expect(landingPathForRoles(["student", "admin"])).toBe("/admin/stats");
    expect(landingPathForRoles(["admin", "student"])).toBe("/admin/stats");
    expect(landingPathForRoles(["teacher", "manager"])).toBe("/management");
    expect(landingPathForRoles(["student", "teacher"])).toBe("/teacher");
  });

  it("ranks dean above manager", () => {
    // The dean role is a strict superset of manager, so a dean holding both
    // must not land somewhere that hides their review queue. Both happen to
    // resolve to /management today; asserting the ROLE keeps the intent
    // checkable if the paths ever diverge.
    expect(highestRole(["manager", "hod"])).toBe("hod");
    expect(highestRole(["hod", "manager"])).toBe("hod");
  });

  it("falls back to the student dashboard for unknown or empty roles", () => {
    expect(landingPathForRoles([])).toBe(DEFAULT_LANDING);
    expect(landingPathForRoles(["something_new"])).toBe(DEFAULT_LANDING);
    expect(highestRole([])).toBeNull();
    expect(highestRole(["something_new"])).toBeNull();
  });

  it("never lets an unrecognised code outrank a known one", () => {
    // A role added to the backend before this table is updated must not
    // silently win: the known role still decides.
    expect(landingPathForRoles(["zzz_superadmin", "teacher"])).toBe("/teacher");
    expect(landingPathForRoles(["aaa_role", "student"])).toBe("/dashboard");
  });

  it("gives every role in the precedence table a landing path", () => {
    for (const role of ROLE_PRECEDENCE) {
      const path = landingPathForRoles([role]);
      expect(path.startsWith("/")).toBe(true);
    }
  });

  it("never lands anyone back on '/'", () => {
    // The root route redirects authenticated users to their landing path. If a
    // landing path were "/" that redirect would target itself and the app would
    // hang in a loop instead of rendering. Nothing else enforces this, so it is
    // asserted for every role AND the no-role fallback.
    for (const role of ROLE_PRECEDENCE) {
      expect(landingPathForRoles([role])).not.toBe("/");
    }
    expect(landingPathForRoles([])).not.toBe("/");
    expect(DEFAULT_LANDING).not.toBe("/");
  });
});
