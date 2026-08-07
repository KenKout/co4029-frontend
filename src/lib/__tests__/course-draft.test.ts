import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCourseDraft,
  draftIsRestorable,
  loadCourseDraft,
  saveCourseDraft,
  type CourseDraft,
  type CourseDraftForm,
} from "@/lib/course-draft";

const emptyForm: CourseDraftForm = {
  title: "",
  slug: "",
  description: "",
  level: "beginner",
  estimated_minutes: "",
  expected_completion_days: "",
  enrollment_cap: "",
  teacherIds: [],
};

describe("course draft", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("round-trips a draft", () => {
    saveCourseDraft({
      form: { ...emptyForm, title: "Networks" },
      done: [],
    });
    expect(loadCourseDraft()?.form.title).toBe("Networks");
  });

  it("keeps the created course id so a retry cannot duplicate the course", () => {
    // The whole point of the server-half draft: after the POST lands, the id
    // must survive a reload, or pressing the button again creates a second
    // course.
    saveCourseDraft({
      form: { ...emptyForm, title: "Networks" },
      courseId: "course-1",
      done: ["create"],
    });
    const restored = loadCourseDraft();
    expect(restored?.courseId).toBe("course-1");
    expect(restored?.done).toContain("create");
  });

  it("records individual teacher assignments so none is repeated", () => {
    saveCourseDraft({
      form: { ...emptyForm, teacherIds: ["u1", "u2"] },
      courseId: "course-1",
      done: ["create", "teacher:u1"],
    });
    expect(loadCourseDraft()?.done).toEqual(["create", "teacher:u1"]);
  });

  it("expires a draft older than a day", () => {
    const stale: CourseDraft = {
      form: { ...emptyForm, title: "Old" },
      done: [],
      savedAt: Date.now() - 25 * 60 * 60 * 1000,
    };
    window.localStorage.setItem(
      "abridgeai.coursedraft.v1",
      JSON.stringify(stale),
    );
    expect(loadCourseDraft()).toBeNull();
    // And it is cleaned up rather than re-read on every visit.
    expect(window.localStorage.getItem("abridgeai.coursedraft.v1")).toBeNull();
  });

  it("treats a malformed done list as nothing completed", () => {
    // `done` decides which steps are SKIPPED, so garbage must never read as
    // "everything already finished".
    window.localStorage.setItem(
      "abridgeai.coursedraft.v1",
      JSON.stringify({ form: emptyForm, done: "all", savedAt: Date.now() }),
    );
    expect(loadCourseDraft()?.done).toEqual([]);
  });

  it("survives corrupt json", () => {
    window.localStorage.setItem("abridgeai.coursedraft.v1", "{not json");
    expect(loadCourseDraft()).toBeNull();
  });

  it("does not offer an untouched form", () => {
    expect(draftIsRestorable({ form: emptyForm, done: [], savedAt: Date.now() })).toBe(
      false,
    );
  });

  it("always offers a draft holding a course id, even with an empty form", () => {
    // A created-but-unfinished course must be resumable no matter how sparse
    // the form looks — otherwise the manager's only route forward is to create
    // a duplicate.
    expect(
      draftIsRestorable({
        form: emptyForm,
        courseId: "course-1",
        done: ["create"],
        savedAt: Date.now(),
      }),
    ).toBe(true);
  });

  it("clears", () => {
    saveCourseDraft({ form: { ...emptyForm, title: "x" }, done: [] });
    clearCourseDraft();
    expect(loadCourseDraft()).toBeNull();
  });
});
