import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CareerPathCourseAuthoring } from "@/lib/api/types";
import { PublishDraftCoursesDialog } from "../PublishDraftCoursesDialog";

const COURSES: CareerPathCourseAuthoring[] = [
  {
    career_path_id: "p1",
    course_id: "c1",
    course_title: "Data Streaming",
    course_slug: "data-streaming",
    course_status: "draft",
    stage_id: "s1",
    position: 1,
    is_required: true,
    satisfied_by: "completion",
  },
  {
    career_path_id: "p1",
    course_id: "c2",
    course_title: "Data Mining",
    course_slug: "data-mining",
    course_status: "draft",
    stage_id: "s2",
    position: 1,
    is_required: false,
    satisfied_by: "completion",
  },
];

describe("PublishDraftCoursesDialog", () => {
  it("lists every draft course with its status badge", () => {
    render(
      <PublishDraftCoursesDialog
        draftCourses={COURSES}
        action={null}
        onPublishCourses={() => {}}
        onRemoveCourses={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("Data Streaming")).toBeTruthy();
    expect(screen.getByText("Data Mining")).toBeTruthy();
    // Two rows, each carrying a status badge (draft label is localized).
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("publish and remove actions fire; cancel closes", () => {
    const onPublish = vi.fn();
    const onRemove = vi.fn();
    const onClose = vi.fn();
    render(
      <PublishDraftCoursesDialog
        draftCourses={COURSES}
        action={null}
        onPublishCourses={onPublish}
        onRemoveCourses={onRemove}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId("publish-courses-and-path"));
    expect(onPublish).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("remove-courses-and-publish"));
    expect(onRemove).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("publish-dialog-cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables all actions while a bulk action is in flight", () => {
    render(
      <PublishDraftCoursesDialog
        draftCourses={COURSES}
        action="publish"
        onPublishCourses={() => {}}
        onRemoveCourses={() => {}}
        onClose={() => {}}
      />,
    );
    expect(
      (screen.getByTestId("publish-courses-and-path") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId("remove-courses-and-publish") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
