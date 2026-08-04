import { describe, expect, it } from "vitest";

import type { ModuleItemPublic, ModulePublic, QuizProgressRead } from "@/lib/api/types";

import {
  earliestPendingItemId,
  itemStateFor,
  moduleIsComplete,
} from "../helpers";
import type { FlatItem, LessonState } from "../types";

function item(
  id: string,
  itemType: ModuleItemPublic["item_type"],
  position: number,
): ModuleItemPublic {
  return { id, item_type: itemType, position } as ModuleItemPublic;
}

function quizItem(id: string, position: number): ModuleItemPublic {
  return {
    id,
    item_type: "quiz",
    position,
    target: { id, title: `quiz-${id}` },
  } as ModuleItemPublic;
}

function flatItem(mod: string, it: ModuleItemPublic): FlatItem {
  return {
    moduleId: mod,
    moduleTitle: mod,
    item: it,
    label: it.id,
  };
}

function mod(id: string): ModulePublic {
  return { id, title: id, position: 1 } as ModulePublic;
}

/** state fn driven by an explicit map; unknown items default to "pending". */
function stateFor(overrides: Record<string, LessonState>) {
  return (fi: FlatItem) => overrides[fi.item.id] ?? "pending";
}

function quizProgress(overrides: Partial<QuizProgressRead>): QuizProgressRead {
  return {
    quiz_id: "q",
    attempts_used: 0,
    max_attempts: 2,
    allow_retakes: true,
    passed: null,
    grade_percent: null,
    completed: false,
    attempts_remaining: 2,
    ...overrides,
  };
}

function progressMap(rows: QuizProgressRead[]): Map<string, QuizProgressRead> {
  return new Map(rows.map((r) => [r.quiz_id, r]));
}

describe("moduleIsComplete", () => {
  it("returns false for a module with no items", () => {
    expect(moduleIsComplete(mod("m1"), [], stateFor({}))).toBe(false);
  });

  it("returns true when every lesson item is completed", () => {
    const flat = [
      flatItem("m1", item("l1", "lesson", 1)),
      flatItem("m1", item("l2", "lesson", 2)),
    ];
    expect(
      moduleIsComplete(mod("m1"), flat, stateFor({ l1: "completed", l2: "completed" })),
    ).toBe(true);
  });

  it("returns false when any item is still pending", () => {
    const flat = [
      flatItem("m1", item("l1", "lesson", 1)),
      flatItem("m1", item("l2", "lesson", 2)),
    ];
    expect(
      moduleIsComplete(mod("m1"), flat, stateFor({ l1: "completed", l2: "pending" })),
    ).toBe(false);
  });

  it("treats the active lesson as incomplete (not completed)", () => {
    const flat = [flatItem("m1", item("l1", "lesson", 1))];
    expect(
      moduleIsComplete(mod("m1"), flat, stateFor({ l1: "active" })),
    ).toBe(false);
  });

  it("never reports a module with quiz/interview items complete (no data)", () => {
    const flat = [
      flatItem("m1", item("l1", "lesson", 1)),
      flatItem("m1", item("q1", "quiz", 2)),
    ];
    expect(
      moduleIsComplete(mod("m1"), flat, stateFor({ l1: "completed", q1: "pending" })),
    ).toBe(false);
  });

  it("reports a module complete when its quiz item is completed", () => {
    const flat = [
      flatItem("m1", item("l1", "lesson", 1)),
      flatItem("m1", quizItem("q1", 2)),
    ];
    expect(
      moduleIsComplete(mod("m1"), flat, stateFor({ l1: "completed", q1: "completed" })),
    ).toBe(true);
  });

  it("keeps a module open when its quiz is failed but retakes remain", () => {
    const flat = [
      flatItem("m1", item("l1", "lesson", 1)),
      flatItem("m1", quizItem("q1", 2)),
    ];
    expect(
      moduleIsComplete(mod("m1"), flat, stateFor({ l1: "completed", q1: "pending" })),
    ).toBe(false);
  });

  it("ignores items belonging to other modules", () => {
    const flat = [
      flatItem("m1", item("l1", "lesson", 1)),
      flatItem("m2", item("l2", "lesson", 1)),
    ];
    expect(
      moduleIsComplete(mod("m1"), flat, stateFor({ l1: "completed", l2: "pending" })),
    ).toBe(true);
  });
});

describe("earliestPendingItemId", () => {
  it("returns undefined when everything is completed", () => {
    const flat = [
      flatItem("m1", item("l1", "lesson", 1)),
      flatItem("m1", item("l2", "lesson", 2)),
    ];
    expect(
      earliestPendingItemId(flat, stateFor({ l1: "completed", l2: "completed" })),
    ).toBeUndefined();
  });

  it("returns the first pending item in course order", () => {
    const flat = [
      flatItem("m1", item("l1", "lesson", 1)),
      flatItem("m1", item("l2", "lesson", 2)),
      flatItem("m2", item("l3", "lesson", 1)),
    ];
    expect(
      earliestPendingItemId(flat, stateFor({ l1: "completed", l2: "pending", l3: "pending" })),
    ).toBe("l2");
  });

  it("skips the active lesson and points at the next pending item", () => {
    const flat = [
      flatItem("m1", item("l1", "lesson", 1)),
      flatItem("m1", item("l2", "lesson", 2)),
    ];
    expect(
      earliestPendingItemId(flat, stateFor({ l1: "active", l2: "pending" })),
    ).toBe("l2");
  });

  it("points at a pending quiz when it is the earliest open item", () => {
    const flat = [
      flatItem("m1", item("l1", "lesson", 1)),
      flatItem("m1", item("q1", "quiz", 2)),
    ];
    expect(
      earliestPendingItemId(flat, stateFor({ l1: "completed", q1: "pending" })),
    ).toBe("q1");
  });

  it("skips a completed quiz and points at the next pending item", () => {
    const flat = [
      flatItem("m1", item("l1", "lesson", 1)),
      flatItem("m1", quizItem("q1", 2)),
      flatItem("m1", item("l2", "lesson", 3)),
    ];
    expect(
      earliestPendingItemId(
        flat,
        stateFor({ l1: "completed", q1: "completed", l2: "pending" }),
      ),
    ).toBe("l2");
  });
});

describe("itemStateFor quiz completion", () => {
  const emptyLessonMap = new Map<string, string>();

  it("marks a passed quiz as completed", () => {
    const fi = flatItem("m1", quizItem("q1", 1));
    const map = progressMap([
      quizProgress({ quiz_id: "q1", completed: true, passed: true, attempts_used: 1 }),
    ]);
    expect(itemStateFor(fi, undefined, emptyLessonMap, map)).toBe("completed");
  });

  it("marks a failed-but-exhausted quiz as completed", () => {
    const fi = flatItem("m1", quizItem("q1", 1));
    const map = progressMap([
      quizProgress({
        quiz_id: "q1",
        completed: true,
        passed: false,
        attempts_used: 2,
        attempts_remaining: 0,
      }),
    ]);
    expect(itemStateFor(fi, undefined, emptyLessonMap, map)).toBe("completed");
  });

  it("keeps a failed quiz with attempts remaining pending", () => {
    const fi = flatItem("m1", quizItem("q1", 1));
    const map = progressMap([
      quizProgress({
        quiz_id: "q1",
        completed: false,
        passed: false,
        attempts_used: 1,
        attempts_remaining: 1,
      }),
    ]);
    expect(itemStateFor(fi, undefined, emptyLessonMap, map)).toBe("pending");
  });

  it("keeps an in-flight quiz pending even when slots are exhausted", () => {
    const fi = flatItem("m1", quizItem("q1", 1));
    const map = progressMap([
      quizProgress({
        quiz_id: "q1",
        completed: false,
        passed: null,
        attempts_used: 1,
        attempts_remaining: 0,
      }),
    ]);
    expect(itemStateFor(fi, undefined, emptyLessonMap, map)).toBe("pending");
  });

  it("treats a quiz as pending when the progress map has no row for it", () => {
    const fi = flatItem("m1", quizItem("q1", 1));
    expect(itemStateFor(fi, undefined, emptyLessonMap, new Map())).toBe("pending");
  });

  it("ignores the progress map when the row is absent (data still loading)", () => {
    const fi = flatItem("m1", quizItem("q1", 1));
    expect(itemStateFor(fi, undefined, emptyLessonMap)).toBe("pending");
  });
});
