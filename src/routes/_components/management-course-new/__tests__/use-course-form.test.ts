import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  EMPTY_COURSE_FORM,
  useCourseForm,
  type CourseFormValues,
} from "../use-course-form";

// The slug-availability hook fires a network query; the form logic under test
// does not depend on its result.
vi.mock("@/lib/api/hooks/teacher-courses", () => ({
  useSlugAvailability: () => ({ data: undefined, isFetching: false }),
}));

const restored: CourseFormValues = {
  ...EMPTY_COURSE_FORM,
  title: "Restored Course",
  slug: "restored-course",
  description: "from the draft",
};

describe("useCourseForm restore", () => {
  it("adopts values that arrive AFTER the first render", () => {
    // The regression this pins: `initialForm` was only read by useState's
    // initialiser, which React runs once. The restore decision is made by the
    // manager clicking a button — always after that first render — so the
    // recovered values were computed, passed in, and silently ignored. The
    // button appeared to do nothing.
    const { result, rerender } = renderHook(
      ({ initial }: { initial?: CourseFormValues }) =>
        useCourseForm(false, initial),
      { initialProps: { initial: undefined as CourseFormValues | undefined } },
    );

    expect(result.current.form.title).toBe("");

    rerender({ initial: restored });

    expect(result.current.form.title).toBe("Restored Course");
    expect(result.current.form.slug).toBe("restored-course");
    expect(result.current.form.description).toBe("from the draft");
  });

  it("does not clobber edits made after the restore", () => {
    const { result, rerender } = renderHook(
      ({ initial }: { initial?: CourseFormValues }) =>
        useCourseForm(false, initial),
      { initialProps: { initial: undefined as CourseFormValues | undefined } },
    );

    rerender({ initial: restored });
    act(() => result.current.handleTitleChange("Edited After Restore"));

    // A re-render with the SAME draft object must not reset what was typed
    // since — otherwise every keystroke fights the restore.
    rerender({ initial: restored });
    expect(result.current.form.title).toBe("Edited After Restore");
  });

  it("keeps a restored slug when the title is retyped", () => {
    const { result, rerender } = renderHook(
      ({ initial }: { initial?: CourseFormValues }) =>
        useCourseForm(false, initial),
      { initialProps: { initial: undefined as CourseFormValues | undefined } },
    );

    rerender({ initial: restored });
    // "restored-course" is not slugify("Restored Course")'s only possible
    // source — it was hand-kept, so retyping the title must not overwrite it.
    act(() => result.current.handleTitleChange("Different Title"));
    expect(result.current.form.slug).toBe("restored-course");
  });

  it("still auto-slugs a fresh form", () => {
    const { result } = renderHook(() => useCourseForm(false));
    act(() => result.current.handleTitleChange("Intro to Algorithms"));
    expect(result.current.form.slug).toBe("intro-to-algorithms");
  });
});
