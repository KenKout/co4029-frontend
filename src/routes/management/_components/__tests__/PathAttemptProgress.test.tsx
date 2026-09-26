import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { PathExitSnapshot } from "@/lib/api/types";
import { PathAttemptProgress } from "@/components/learning-programs/PathAttemptProgress";

const snapshot: PathExitSnapshot = {
  schema_version: 2,
  career_path_id: "11111111-1111-1111-1111-111111111111",
  career_path_version_id: "22222222-2222-2222-2222-222222222222",
  completed_course_ids: ["33333333-3333-3333-3333-333333333333"],
  completed_courses: 1,
  total_courses: 2,
  overall_percent: 50,
  captured_at: "2026-09-26T10:30:00Z",
  courses: [
    {
      course_id: "33333333-3333-3333-3333-333333333333",
      title: "Course one",
      slug: "course-one",
      progress_percent: 100,
      completed: true,
    },
    {
      course_id: "44444444-4444-4444-4444-444444444444",
      title: "Course two",
      slug: "course-two",
      progress_percent: 40,
      completed: false,
    },
  ],
};

describe("PathAttemptProgress", () => {
  it("shows the frozen summary and expands the per-course snapshot", async () => {
    const user = userEvent.setup();
    render(
      <PathAttemptProgress
        snapshot={snapshot}
        progressPercent={90}
        completedCourses={9}
        totalCourses={10}
      />,
    );

    expect(screen.getByText("Khi rời lộ trình")).toBeInTheDocument();
    expect(screen.getByText("50% · 1/2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Xem 2 khoá học" }));
    expect(screen.getByText("Course one")).toBeInTheDocument();
    expect(screen.getByText("Course two")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("keeps legacy snapshots understandable without inventing course detail", () => {
    render(
      <PathAttemptProgress
        snapshot={{ ...snapshot, schema_version: 1, courses: [] }}
        progressPercent={90}
        completedCourses={9}
        totalCourses={10}
      />,
    );

    expect(
      screen.getByText(
        "Lần chuyển cũ này chưa lưu chi tiết theo từng khoá học.",
      ),
    ).toBeInTheDocument();
  });
});
