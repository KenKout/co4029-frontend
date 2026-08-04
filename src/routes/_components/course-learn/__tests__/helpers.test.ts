import { describe, expect, it } from "vitest";

import type { ModuleItemPublic, ModulePublic } from "@/lib/api/types";

import {
  earliestPendingItemId,
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
});
