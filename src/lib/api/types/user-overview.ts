import type { User } from "../types";

/**
 * Manager/HOD user-detail overview (GET /users/{id}/overview).
 *
 * The committed openapi snapshot predates these payloads (same hand-layered
 * pattern as CourseContactFields in types.ts), so the shapes are declared
 * here against the wire contract instead of generated schema lookups. The
 * backend serves identity always, plus role-dependent sections: student →
 * courses + career paths + last active; teacher → assigned courses;
 * manager/HOD/admin → identity only.
 */
export interface UserCourseProgressRead {
  course_id: string;
  title: string;
  slug: string;
  status: string;
  enrollment_status: string;
  enrolled_at: string;
  completion_percent: number;
  completed_lessons: number;
  total_lessons: number;
}

export interface UserCareerPathProgressRead {
  career_path_id: string;
  name: string;
  slug: string;
  status: string;
  started_at: string;
  completed_at?: string | null;
  completed_courses: number;
  course_count: number;
  completion_percent: number;
}

/**
 * One path a student took inside a learning program.
 *
 * A path switch is recorded as a NEW attempt rather than by mutating the old
 * one, so this list is the student's path history — what they chose, what
 * they left, and when.
 */
export interface UserProgramPathAttemptRead {
  career_path_id: string;
  career_path_name?: string | null;
  status: string;
  selected_at: string;
  ended_at?: string | null;
}

/**
 * Learning-program enrolment + progress.
 *
 * Distinct from `UserCareerPathProgressRead`: a program pins a specific path
 * VERSION, so `completion_percent` is measured against what the student was
 * enrolled onto, not the path's current head.
 */
export interface UserProgramProgressRead {
  enrollment_id: string;
  learning_program_id: string;
  program_name: string;
  program_version_no: number;
  status: string;
  enrolled_at: string;
  completed_at?: string | null;
  withdrawn_at?: string | null;
  completed_courses: number;
  course_count: number;
  completion_percent: number;
  max_path_switches: number;
  approved_switch_count: number;
  attempts: UserProgramPathAttemptRead[];
}

export interface UserAssignedCourseRead {
  course_id: string;
  title: string;
  slug: string;
  status: string;
}

export interface UserOverview {
  user: User & {
    roles?: string[];
    organization_id?: string | null;
    organization_name?: string | null;
  };
  courses: UserCourseProgressRead[];
  career_paths: UserCareerPathProgressRead[];
  programs: UserProgramProgressRead[];
  assigned_courses: UserAssignedCourseRead[];
  last_active_at?: string | null;
}
