/**
 * Manager/dept-surface course types.
 *
 * Split out of `types.ts` because that file hit the 800-line eslint cap (a
 * lint-only rule that `tsc` and `build` both ignore). These three describe the
 * dept course page rather than anything a learner sees, so they were the
 * natural seam. Re-exported from `types.ts`, so importers do not care which
 * file a type lives in.
 */

/**
 * Course-scoped teacher title (user decision 2026-08-18, "no catalog logic
 * for titles"): exactly one Course Instructor, everyone else a Teacher
 * Assistant.
 */
export type CourseTeacherRole = "course_instructor" | "teacher_assistant";

/**
 * A teacher assigned to a course, with their course-scoped title.
 *
 * Hand-authored (same layering as `CourseContactFields` in `types.ts`): the
 * committed openapi snapshot predates `course_role`. Kept in sync with the
 * backend `TeacherAssignmentRead` schema until a coordinated snapshot refresh.
 */
export interface TeacherAssignmentRead {
  user_id: string;
  display_name: string;
  primary_email: string;
  assignment_id?: string | null;
  active_from?: string | null;
  active_until?: string | null;
  avatar_url?: string | null;
  course_role?: CourseTeacherRole | null;
}

/**
 * Assign a teacher to a course. `course_role` is optional: the service forces
 * the first teacher on a course to `course_instructor` regardless, and a
 * second `course_instructor` is rejected server-side with 409.
 */
export interface AssignTeacherRequest {
  user_id: string;
  course_role?: CourseTeacherRole | null;
}

/** Where a course sits on one career path. */
export interface CoursePathPlacement {
  career_path_id: string;
  career_path_name: string;
  career_path_status: string;
  stage_id: string;
  stage_title?: string | null;
  stage_position: number;
  is_required: boolean;
}

/**
 * Whether a course is actually deliverable — asked before publish rather than
 * discovered as a 409 after. `can_publish` mirrors the backend publish gate's
 * condition exactly, so the checklist cannot promise a publish that then fails.
 */
export interface CourseReadiness {
  course_id: string;
  status: string;
  teacher_count: number;
  course_instructor_count: number;
  min_teachers_per_course: number;
  max_teachers_per_course: number;
  /** True when `teacher_count` sits inside [min, max] and any required title
   *  exists (a course must be staffed within its bounds before it can publish
   *  — the manager's checklist mirrors the publish gate's condition exactly). */
  staffing_ok: boolean;
  gradeable_unit_count: number;
  learning_outcome_count: number;
  career_paths: CoursePathPlacement[];
  /** No gradeable unit AND required on a path: it is locking that stage and
   *  every stage behind it for every student. */
  blocks_required_stage: boolean;
  can_publish: boolean;
}

/**
 * A teacher the manager may assign to a course. The list is org-scoped
 * server-side from the course, so every entry is already a legal choice —
 * render it, do not filter it.
 */
export interface AssignableTeacher {
  user_id: string;
  primary_email: string;
  display_name?: string | null;
  /** Already teaches this course: show as chosen, do not offer a no-op. */
  already_assigned?: boolean;
}
