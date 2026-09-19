import { describe, expect, it } from "vitest";

/**
 * Audit P1 (URL cross-course): the config id rides the URL verbatim, so a
 * hand-edited link can pair Course A's slug with Course B's published config
 * — starting B's assessment under A's context and invalidating A's progress
 * cache on finish. The guard lives in use-interview-route-data: a config
 * whose course_id differs from the resolved course is treated as missing.
 *
 * The mismatch math is a pure predicate; the hook applies it before any
 * screen renders. Pinned here as the extractable contract.
 */

export function configBelongsToCourse(
  config: { course_id: string } | undefined,
  course: { id: string } | undefined,
): boolean {
  if (!config || !course) return false;
  return config.course_id === course.id;
}

describe("course/config URL mismatch guard", () => {
  it("rejects a config from another course", () => {
    expect(
      configBelongsToCourse(
        { course_id: "course-b" },
        { id: "course-a" },
      ),
    ).toBe(false);
  });

  it("accepts the matching config", () => {
    expect(
      configBelongsToCourse(
        { course_id: "course-a" },
        { id: "course-a" },
      ),
    ).toBe(true);
  });

  it("treats absent config or course as non-belonging", () => {
    expect(configBelongsToCourse(undefined, { id: "course-a" })).toBe(false);
    expect(configBelongsToCourse({ course_id: "course-a" }, undefined)).toBe(
      false,
    );
  });
});
