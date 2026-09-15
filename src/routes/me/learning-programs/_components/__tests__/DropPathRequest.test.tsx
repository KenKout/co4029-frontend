import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DropPathRequest } from "../DropPathRequest";
import type { LearningProgramEnrollment } from "@/lib/api/types";

/**
 * The drop control's whole job is deciding when NOT to offer itself.
 *
 * Dropping is reviewed, costs a finite path change, and is refused outright
 * when it would leave a student with no active path. Offering the button in
 * those cases produces a request the server will reject — so the gate is the
 * behaviour worth pinning, not the dialog markup.
 */

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key.split(".").pop() ?? key }),
}));

const mutateAsync = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/hooks/learning-programs", () => ({
  useRequestProgramPathDrop: () => ({ mutateAsync, isPending: false }),
}));

function attempt(id: string, status: "active" | "completed") {
  return {
    id,
    career_path_id: `path-${id}`,
    career_path_version_id: `ver-${id}`,
    previous_attempt_id: null,
    status,
    selection_source: "student",
    selected_at: "2026-01-01T00:00:00Z",
    ended_at: null,
    exit_snapshot: null,
    progress_percent: 0,
    completed_courses: 0,
    total_courses: 4,
  } satisfies LearningProgramEnrollment["attempts"][number];
}

function enrollment(
  overrides: Partial<LearningProgramEnrollment> = {},
): LearningProgramEnrollment {
  return {
    id: "enr-1",
    learning_program_id: "prog-1",
    program_version_id: "ver-1",
    student_id: "stu-1",
    status: "active",
    enrolled_at: "2026-01-01T00:00:00Z",
    completed_at: null,
    withdrawn_at: null,
    program_name: "Software Engineering",
    program_version_no: 1,
    max_path_switches: 3,
    approved_switch_count: 0,
    max_career_paths: 2,
    selected_path_count: 2,
    current_progress_percent: 0,
    current_completed_courses: 0,
    current_total_courses: 8,
    paths: [],
    attempts: [attempt("a", "active"), attempt("b", "active")],
    pending_change_request: null,
    change_request_history: [],
    ...overrides,
  };
}

function renderFor(overrides: Partial<LearningProgramEnrollment> = {}) {
  render(
    <DropPathRequest
      enrollment={enrollment(overrides)}
      attemptId="a"
      pathName="Backend Engineer"
    />,
  );
}

describe("DropPathRequest", () => {
  it("offers the drop while a second path is still active", () => {
    renderFor();
    expect(screen.getByRole("button", { name: "action" })).toBeInTheDocument();
  });

  it("hides the drop when it is the student's only active path", () => {
    // The server refuses this as `at_least_one_path_must_remain`; dropping
    // your last path is leaving the program, which is a withdrawal.
    renderFor({ attempts: [attempt("a", "active")] });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("does not count a completed path as one the student is still sitting", () => {
    renderFor({ attempts: [attempt("a", "active"), attempt("b", "completed")] });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("hides the drop while another request is already open", () => {
    // One open request per enrolment — `pending` and `in_progress` alike.
    renderFor({
      pending_change_request: {
        status: "pending",
      } as LearningProgramEnrollment["pending_change_request"],
    });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("hides the drop once the switch budget is spent", () => {
    // An approved drop consumes a path change and is never refunded, so a
    // student with none left cannot file one.
    renderFor({ max_path_switches: 2, approved_switch_count: 2 });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("hides the drop when the enrolment is no longer active", () => {
    renderFor({ status: "withdrawn" });
    expect(screen.queryByRole("button")).toBeNull();
  });
});
