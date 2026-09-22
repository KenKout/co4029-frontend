import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CourseContentItem } from "@/lib/api/types/common";
import type { LessonRead } from "@/lib/api/types/teacher";

import { useLessonEditorState } from "./use-lesson-editor-state";

const lesson = {
  id: "lesson-1",
  title: "Lesson",
  summary: "Summary",
  lesson_type: "reading",
  status: "draft",
  difficulty: "intermediate",
  estimated_minutes: 10,
  notes_markdown: "Notes",
} as LessonRead;

const moduleItem = {
  id: "item-1",
  unlock_rule_json: { prerequisites: [] },
} as unknown as CourseContentItem;

describe("useLessonEditorState unsaved baseline", () => {
  it("marks prerequisite settings dirty and asks before leaving", () => {
    const { result } = renderHook(() =>
      useLessonEditorState({ lesson, moduleItem }),
    );

    act(() => {
      result.current.setPrerequisites(["lesson-previous"]);
    });

    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.leaveGuard.run(() => undefined);
    });
    expect(result.current.leaveGuard.isAsking).toBe(true);
  });

  it("clears the warning baseline after a successful save", () => {
    const { result } = renderHook(() =>
      useLessonEditorState({ lesson, moduleItem }),
    );

    act(() => {
      result.current.setEstimatedMinutes("25");
    });
    act(() => {
      result.current.setPrerequisites(["lesson-previous"]);
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.markSaved();
      result.current.setSaved(true);
    });

    expect(result.current.isDirty).toBe(false);
    act(() => {
      result.current.leaveGuard.run(() => undefined);
    });
    expect(result.current.leaveGuard.isAsking).toBe(false);
  });
});
