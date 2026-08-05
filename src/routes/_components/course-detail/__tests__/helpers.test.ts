import { describe, expect, it } from "vitest";

import type {
  ModuleItemPublic,
  ModulePublic,
  MyCourseProgressSummary,
} from "@/lib/api/types";
import {
  formatEstimatedDuration,
  lessonCount,
  moduleCompletion,
} from "@/routes/_components/course-detail/helpers";

function lessonItem(id: string): ModuleItemPublic {
  return {
    id: `mi-${id}`,
    module_id: "mod",
    item_type: "lesson",
    position: 1,
    target: { id, title: id },
  };
}

function moduleWith(items: ModuleItemPublic[]): ModulePublic {
  return {
    id: "mod",
    course_id: "course",
    title: "Mod",
    position: 1,
    items,
  };
}

function progressWith(
  statuses: Record<string, string>,
): MyCourseProgressSummary {
  return {
    course_id: "course",
    total_lessons: Object.keys(statuses).length,
    completed_lessons: Object.values(statuses).filter(
      (s) => s === "completed",
    ).length,
    in_progress_lessons: 0,
    not_started_lessons: 0,
    completion_percent: "50",
    total_time_seconds: 0,
    last_activity_at: null,
    lessons: Object.entries(statuses).map(([lesson_id, status]) => ({
      lesson_id,
      status,
      completion_percent: "100",
      last_activity_at: null,
      total_time_seconds: 0,
    })),
  };
}

describe("formatEstimatedDuration", () => {
  it("renders whole hours without minutes (exact, no rounding)", () => {
    expect(formatEstimatedDuration(7200)).toBe("120h");
    expect(formatEstimatedDuration(60)).toBe("1h");
  });

  it("renders hours plus remainder minutes", () => {
    expect(formatEstimatedDuration(150)).toBe("2h 30m");
  });

  it("renders bare minutes under an hour", () => {
    expect(formatEstimatedDuration(45)).toBe("45m");
  });

  it("returns null for absent, zero or negative values", () => {
    expect(formatEstimatedDuration(null)).toBeNull();
    expect(formatEstimatedDuration(undefined)).toBeNull();
    expect(formatEstimatedDuration(0)).toBeNull();
    expect(formatEstimatedDuration(-5)).toBeNull();
  });
});

describe("lessonCount", () => {
  it("counts only lesson-type items", () => {
    const mod = moduleWith([
      lessonItem("l1"),
      lessonItem("l2"),
      { ...lessonItem("q1"), item_type: "quiz" },
      { ...lessonItem("i1"), item_type: "interview" },
    ]);
    expect(lessonCount(mod)).toBe(2);
  });

  it("returns 0 for a module without lesson items", () => {
    expect(lessonCount(moduleWith([]))).toBe(0);
  });
});

describe("moduleCompletion", () => {
  it("is complete when every lesson item is completed", () => {
    const mod = moduleWith([lessonItem("l1"), lessonItem("l2")]);
    expect(
      moduleCompletion(mod, progressWith({ l1: "completed", l2: "completed" })),
    ).toBe("complete");
  });

  it("is partial when only some lessons are done", () => {
    const mod = moduleWith([lessonItem("l1"), lessonItem("l2")]);
    expect(
      moduleCompletion(mod, progressWith({ l1: "completed", l2: "in_progress" })),
    ).toBe("partial");
  });

  it("is none when nothing is started", () => {
    const mod = moduleWith([lessonItem("l1")]);
    expect(
      moduleCompletion(mod, progressWith({ l1: "not_started" })),
    ).toBe("none");
  });

  it("is none without progress data (anonymous / unenrolled)", () => {
    const mod = moduleWith([lessonItem("l1")]);
    expect(moduleCompletion(mod, undefined)).toBe("none");
  });

  it("is none when the module has no lesson items", () => {
    const mod = moduleWith([
      { ...lessonItem("q1"), item_type: "quiz" },
    ]);
    expect(moduleCompletion(mod, progressWith({}))).toBe("none");
  });
});
