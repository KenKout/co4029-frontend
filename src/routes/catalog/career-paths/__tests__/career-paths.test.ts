import { describe, expect, it } from "vitest";

import type { CareerPathPublic, MyCareerEnrollmentRead } from "@/lib/api/types";
import {
  currentCareerPathEnrollments,
  visibleCareerPaths,
} from "@/routes/catalog/career-paths/career-paths";

function enrollment(
  careerPathId: string,
  status: MyCareerEnrollmentRead["status"],
): MyCareerEnrollmentRead {
  return {
    career_path_id: careerPathId,
    slug: careerPathId,
    name: careerPathId,
    status,
    started_at: "2026-09-15T00:00:00Z",
    completed_at: status === "completed" ? "2026-09-15T01:00:00Z" : null,
    overall_percent: status === "completed" ? 100 : 25,
    is_prepared: status === "completed",
  };
}

function path(id: string): CareerPathPublic {
  return {
    id,
    slug: id,
    name: id,
    description: null,
    status: "published",
    thumbnail_url: null,
    courses: [],
  };
}

describe("career path explore ownership", () => {
  it("keeps active and completed paths, but excludes dropped history", () => {
    const current = currentCareerPathEnrollments([
      enrollment("active", "active"),
      enrollment("completed", "completed"),
      enrollment("dropped", "dropped"),
    ]);

    expect([...current.keys()]).toEqual(["active", "completed"]);
  });

  it("places the student's paths first without mutating the API order", () => {
    const paths = [path("explore-a"), path("mine"), path("explore-b")];
    const current = currentCareerPathEnrollments([
      enrollment("mine", "active"),
    ]);

    expect(
      visibleCareerPaths(paths, current, "all").map((item) => item.id),
    ).toEqual(["mine", "explore-a", "explore-b"]);
    expect(paths.map((item) => item.id)).toEqual([
      "explore-a",
      "mine",
      "explore-b",
    ]);
  });

  it("isolates the student's paths when the My paths filter is selected", () => {
    const paths = [path("explore"), path("active"), path("completed")];
    const current = currentCareerPathEnrollments([
      enrollment("active", "active"),
      enrollment("completed", "completed"),
    ]);

    expect(
      visibleCareerPaths(paths, current, "mine").map((item) => item.id),
    ).toEqual(["active", "completed"]);
  });
});
