import type { LinkProps } from "@tanstack/react-router";

import type { PriorityTask } from "@/lib/api/hooks/teacher-courses";

/**
 * Where a task's CTA goes, as typed router props.
 *
 * Built here rather than served by the API: a path string in the response
 * hard-codes the SPA's routing table into the backend and breaks silently
 * when a route is renamed. Typed `LinkProps` fail the build instead.
 *
 * Returns null when a task has no id to navigate with — a grouped backlog
 * spanning several courses has no single destination, and the row stays
 * informational rather than pointing somewhere arbitrary.
 */
export function priorityTaskLink(task: PriorityTask): LinkProps | null {
  switch (task.kind) {
    case "student_risk":
      // FR-023: land on the student inside the course that flagged them.
      return task.course_id && task.student_id
        ? {
            to: "/teacher/courses/$courseId/students/$studentId",
            params: { courseId: task.course_id, studentId: task.student_id },
          }
        : null;
    case "quiz_questions_pending":
    case "quiz_calibration":
    case "interview_questions_pending":
    case "materials_ready":
      return task.course_id
        ? { to: "/teacher/courses/$courseId", params: { courseId: task.course_id } }
        : null;
    case "reviews_overdue":
      return task.course_id
        ? { to: "/teacher/courses/$courseId", params: { courseId: task.course_id } }
        : null;
    default:
      return null;
  }
}

/**
 * Age as a short human string, or null when the task carries no age.
 *
 * Null is rendered as nothing at all rather than "0h": an unknown age is
 * not the same as a fresh one, and showing "0h" on an item we cannot date
 * would claim it just arrived.
 */
export function formatAge(hours: number | null): string | null {
  if (hours === null) return null;
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
