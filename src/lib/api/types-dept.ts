/**
 * Manager/dept-surface course types.
 *
 * Split out of `types.ts` because that file hit the 800-line eslint cap (a
 * lint-only rule that `tsc` and `build` both ignore). These three describe the
 * dept course page rather than anything a learner sees, so they were the
 * natural seam. Re-exported from `types.ts`, so importers do not care which
 * file a type lives in.
 */

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
