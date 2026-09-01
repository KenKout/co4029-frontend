import { describe, expect, it } from "vitest";

import type { PriorityTask } from "@/lib/api/hooks/teacher-courses";
import {
  formatAge,
  priorityTaskLink,
} from "@/routes/teacher/_components/teacher-index/work-queue/priority-helpers";

function task(over: Partial<PriorityTask> = {}): PriorityTask {
  return {
    id: "t1",
    kind: "student_risk",
    severity: "high",
    title: "Nguyen Van A",
    reason: "No engagement for 12 days (threshold: 7).",
    course_id: "course-1",
    course_title: "Operating Systems",
    student_id: "student-1",
    age_hours: 288,
    blocking: false,
    count: 1,
    ...over,
  };
}

describe("priority today", () => {
  describe("task links", () => {
    it("sends a student task into the course that flagged them", () => {
      // FR-023: the same student can be at risk in two courses; landing on
      // a generic profile loses which course the teacher was looking at.
      expect(priorityTaskLink(task())).toEqual({
        to: "/teacher/courses/$courseId/students/$studentId",
        params: { courseId: "course-1", studentId: "student-1" },
      });
    });

    it("returns null rather than a dead link for a course-less group", () => {
      // A backlog spanning several courses has no single destination.
      // Rendering it as a link that goes nowhere is worse than plain text.
      expect(
        priorityTaskLink(
          task({ kind: "quiz_questions_pending", course_id: null }),
        ),
      ).toBeNull();
    });

    it("returns null for a student task missing either id", () => {
      expect(priorityTaskLink(task({ student_id: null }))).toBeNull();
      expect(priorityTaskLink(task({ course_id: null }))).toBeNull();
    });

    it("points content tasks at their course when it is known", () => {
      const link = priorityTaskLink(
        task({ kind: "quiz_calibration", course_id: "course-9" }),
      );
      expect(link).toEqual({
        to: "/teacher/courses/$courseId",
        params: { courseId: "course-9" },
      });
    });
  });

  describe("age formatting", () => {
    it("omits the age entirely when it is unknown", () => {
      // "0h" would claim the item just arrived, which is the opposite of
      // what a null age means.
      expect(formatAge(null)).toBeNull();
    });

    it("distinguishes a fresh item from an unknown one", () => {
      expect(formatAge(0)).toBe("just now");
      expect(formatAge(0.5)).toBe("just now");
    });

    it("uses hours inside a day and days beyond it", () => {
      expect(formatAge(1)).toBe("1h");
      expect(formatAge(23.9)).toBe("23h");
      expect(formatAge(24)).toBe("1d");
      expect(formatAge(300)).toBe("12d");
    });
  });
});
