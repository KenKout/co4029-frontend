import { describe, expect, it } from "vitest";

import { findEligibleCoursePathId } from "../use-course-start-eligibility";
import type { CareerPathProgressRead } from "@/lib/api/types";

function progress(
  courseId: string,
  options: { unlocked: boolean; enforcement: "hard" | "soft" | "advisory" },
): CareerPathProgressRead {
  return {
    stages: [
      {
        stage_id: "stage-1",
        position: 1,
        title: null,
        description: null,
        min_optional_to_complete: 0,
        unlock_policy: "always",
        enforcement: options.enforcement,
        unlocked: options.unlocked,
        complete: false,
        latched: false,
        required_count: 1,
        satisfied_required: 0,
        optional_count: 0,
        satisfied_optional: 0,
        stage_total: 1,
        stage_done: 0,
        courses: [{ course_id: courseId } as CareerPathProgressRead["stages"][number]["courses"][number]],
      },
    ],
  } as CareerPathProgressRead;
}

describe("findEligibleCoursePathId", () => {
  it("allows a course from an unlocked active path", () => {
    expect(
      findEligibleCoursePathId("course-1", ["path-1"], [progress("course-1", { unlocked: true, enforcement: "hard" })]),
    ).toBe("path-1");
  });

  it("does not offer a hard-locked course", () => {
    expect(
      findEligibleCoursePathId("course-1", ["path-1"], [progress("course-1", { unlocked: false, enforcement: "hard" })]),
    ).toBeUndefined();
  });

  it("uses another active path when the first path is hard-locked", () => {
    expect(
      findEligibleCoursePathId("course-1", ["path-locked", "path-open"], [
        progress("course-1", { unlocked: false, enforcement: "hard" }),
        progress("course-1", { unlocked: true, enforcement: "hard" }),
      ]),
    ).toBe("path-open");
  });

  it("allows soft and advisory locked stages because the backend allows them", () => {
    expect(
      findEligibleCoursePathId("course-1", ["path-soft"], [progress("course-1", { unlocked: false, enforcement: "soft" })]),
    ).toBe("path-soft");
  });
});
