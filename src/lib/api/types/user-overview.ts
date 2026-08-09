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
  assigned_courses: UserAssignedCourseRead[];
  last_active_at?: string | null;
}
