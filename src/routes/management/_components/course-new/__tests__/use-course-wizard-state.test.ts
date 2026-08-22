import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { saveCourseDraft, loadCourseDraft } from "@/lib/course-draft";
import { EMPTY_COURSE_FORM } from "../use-course-form";
import { useCourseDraftGate } from "../use-course-wizard-state";

describe("useCourseDraftGate", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("offers a stored draft and hands its values over on restore", () => {
    saveCourseDraft({
      form: { ...EMPTY_COURSE_FORM, title: "Recovered" },
      done: [],
    });

    const { result } = renderHook(() => useCourseDraftGate());
    expect(result.current.pendingDraft?.form.title).toBe("Recovered");
    expect(result.current.restored).toBeNull();

    act(() => result.current.acceptDraft());

    // This is what the form consumes. Before the fix it was correctly
    // populated here and then ignored by useState, so asserting the gate alone
    // is not enough — see use-course-form.test.ts for the other half.
    expect(result.current.restored?.form.title).toBe("Recovered");
    expect(result.current.pendingDraft).toBeNull();
  });

  it("keeps the same object identity across renders after a restore", () => {
    // The form adopts the draft via an identity-keyed effect, so a new object
    // on every render would re-apply the draft and overwrite live typing.
    saveCourseDraft({ form: { ...EMPTY_COURSE_FORM, title: "X" }, done: [] });

    const { result, rerender } = renderHook(() => useCourseDraftGate());
    act(() => result.current.acceptDraft());
    const first = result.current.restored?.form;

    rerender();
    expect(result.current.restored?.form).toBe(first);
  });

  it("carries the course id through a restore so a retry cannot duplicate", () => {
    saveCourseDraft({
      form: { ...EMPTY_COURSE_FORM, title: "Half created" },
      courseId: "course-9",
      done: ["create"],
    });

    const { result } = renderHook(() => useCourseDraftGate());
    act(() => result.current.acceptDraft());

    expect(result.current.restored?.courseId).toBe("course-9");
    expect(result.current.restored?.done).toContain("create");
  });

  it("wipes storage when the draft is dismissed", () => {
    saveCourseDraft({ form: { ...EMPTY_COURSE_FORM, title: "Y" }, done: [] });

    const { result } = renderHook(() => useCourseDraftGate());
    act(() => result.current.dismissDraft());

    // Left on disk, the banner would return on the next visit right after the
    // manager said no.
    expect(loadCourseDraft()).toBeNull();
    expect(result.current.pendingDraft).toBeNull();
  });

  it("offers nothing when no draft is stored", () => {
    const { result } = renderHook(() => useCourseDraftGate());
    expect(result.current.pendingDraft).toBeNull();
  });
});
