import { describe, expect, it } from "vitest";

import { lessonScopeFromParam } from "@/lib/api/hooks/spaced-repetition";

/**
 * `?lesson=` used to be a raw UUID and is now a slug. Links minted before the
 * change — SR reminders, notifications, bookmarks — must keep resolving, so
 * the value is sniffed rather than assumed.
 */
describe("lessonScopeFromParam", () => {
  it("sends a slug as lesson_slug", () => {
    expect(lessonScopeFromParam("deadlocks-and-starvation")).toEqual({
      lessonSlug: "deadlocks-and-starvation",
    });
  });

  it("still sends a UUID as lesson_id, so old links resolve", () => {
    const id = "bef02889-4fa5-4671-8bc9-71aa6d875c30";
    expect(lessonScopeFromParam(id)).toEqual({ lessonId: id });
  });

  it("accepts an uppercase UUID", () => {
    const id = "BEF02889-4FA5-4671-8BC9-71AA6D875C30";
    expect(lessonScopeFromParam(id)).toEqual({ lessonId: id });
  });

  it("scopes nothing when the param is absent", () => {
    expect(lessonScopeFromParam(undefined)).toEqual({});
    expect(lessonScopeFromParam("")).toEqual({});
  });

  it("does not mistake a slug that merely contains hex for a UUID", () => {
    // A title like "Chapter 8 Deadlocks" slugs to hex-ish fragments; only the
    // full 8-4-4-4-12 shape counts.
    for (const slug of ["abc-def", "8-4-4-4-12", "bef02889-4fa5-4671-8bc9"]) {
      expect(lessonScopeFromParam(slug)).toEqual({ lessonSlug: slug });
    }
  });

  it("never sets both keys", () => {
    for (const v of ["a-slug", "bef02889-4fa5-4671-8bc9-71aa6d875c30"]) {
      const scope = lessonScopeFromParam(v);
      expect(Object.keys(scope)).toHaveLength(1);
    }
  });
});
