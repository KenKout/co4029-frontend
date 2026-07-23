export interface InstructorRead {
  user_id: string;
  display_name: string;
  bio: string | null;
}

export interface Course {
  id: string;
  organization_id: string;
  org_unit_id: string | null;
  owner_user_id: string;
  slug: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  level: string | null;
  thumbnail_object_id: string | null;
  // Short-TTL presigned GET URL for the course thumbnail, minted server-side.
  // Null when no thumbnail is set — the UI falls back to the gradient banner.
  thumbnail_url?: string | null;
  estimated_minutes: number | null;
  expected_completion_days: number | null;
  enrollment_cap: number | null;
  created_at: string;
  updated_at: string;
}

export interface CourseDetail extends Course {
  instructor: InstructorRead | null;
}

export interface LearningOutcome {
  id: string;
  course_id: string;
  position: number;
  outcome_text: string;
  created_at: string;
  updated_at: string;
}

export interface CourseContentLesson {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  notes_markdown: string | null;
  lesson_type: string;
  difficulty: string | null;
  estimated_minutes: number | null;
  primary_material_id: string | null;
  status: string;
}

export interface CourseContentQuiz {
  id: string;
  title: string;
  status: string;
  question_count: number;
}

export interface CourseContentInterview {
  id: string;
  title: string;
  status: string;
  question_count: number;
}

export interface CourseContentItemTarget {
  id: string;
  title: string;
  slug?: string | null;
  lesson_type?: string | null;
  status?: string | null;
  summary?: string | null;
  estimated_minutes?: number | null;
  difficulty?: string | null;
}

export interface CourseContentItem {
  id: string;
  item_type: "lesson" | "quiz" | "interview";
  lesson_id: string | null;
  quiz_id: string | null;
  interview_config_id: string | null;
  position: number;
  unlock_rule_json: Record<string, unknown>;
  target: CourseContentItemTarget | null;
  lesson: CourseContentLesson | null;
  quiz: CourseContentQuiz | null;
  interview: CourseContentInterview | null;
}

export interface CourseContentModule {
  id: string;
  title: string;
  description: string | null;
  position: number;
  status: string;
  estimated_minutes: number | null;
  items: CourseContentItem[];
}

export interface CourseContent {
  course_id: string;
  modules: CourseContentModule[];
}

export interface CourseTag {
  id: string;
  slug: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface LessonResource {
  id: string;
  lesson_id: string;
  title: string;
  resource_type: string;
  storage_object_id: string | null;
  position: number;
  visible_to_students: boolean;
  created_at: string;
  updated_at: string;
}

export interface StreamUrlResponse {
  stream_url: string;
  expires_at: string;
}
