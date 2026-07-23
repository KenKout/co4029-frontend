export interface MaterialStatus {
  material_id: string;
  current_version_id: string | null;
  processing_status: string | null;
  processing_error: string | null;
  active_job_id: string | null;
  active_job_status: string | null;
  // Live-progress fields from the /processing-summary endpoint
  // (ProcessingProgress). `progress_percent` is the real 0–100 waypoint the
  // worker publishes to Redis per stage; `latest_log_line` carries the
  // current stage label. Optional because older payloads / list rows may
  // omit them.
  progress_percent?: number;
  latest_log_line?: string | null;
}

export interface KGNode {
  id: string;
  label: string;
  type: string;
  definition: string | null;
  weight: number;
}

export interface KGEdge {
  source: string;
  target: string;
  relation: "PREREQUISITE_OF" | "RELATED_TO";
}

export interface LessonKnowledgeGraph {
  lesson_id: string;
  enabled: boolean;
  nodes: KGNode[];
  edges: KGEdge[];
  total_concepts: number;
}

export interface MaterialLatestVersion {
  id: string;
  material_id: string;
  version_no: number;
  storage_object_id: string;
  is_current: boolean;
  processing_status: string;
  processing_error: string | null;
}

export interface LearningMaterial {
  id: string;
  lesson_id: string;
  title: string;
  material_type: string;
  ai_processing_enabled: boolean;
  visible_to_students: boolean;
  current_version_id: string | null;
  // Present on the teacher-facing list endpoint (MaterialAuthoring). Carries
  // the current version's storage_object_id — the join key to a LessonResource
  // uploaded from the same file — plus its processing_status for status badges.
  latest_version?: MaterialLatestVersion | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessingSummary {
  lesson_id: string;
  materials_total: number;
  versions_total: number;
  pending_versions: number;
  processing_versions: number;
  completed_versions: number;
  failed_versions: number;
}

export interface GenerationRun {
  id: string;
  generation_type: string;
  source_scope_kind: string;
  course_id: string | null;
  module_id: string | null;
  lesson_id: string | null;
  requested_by: string | null;
  status: string;
  config_json: Record<string, unknown>;
  dedup_key: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizGeneratePayload {
  quiz_id?: string | null;
  title: string;
  description?: string | null;
  question_count?: number;
  question_types?: string[];
  difficulty?: string;
  bloom_distribution?: Record<string, number>;
  include_prerequisites?: boolean;
  model_preference?: string | null;
  source_lesson_ids?: string[];
  config_json?: Record<string, unknown>;

  // Coverage / personalisation extensions (FR-5 of the
  // 2026-05-16-quiz-quality-and-coverage spec).
  // Defaults preserve topic-mode behaviour, so existing callers continue
  // to work unchanged.
  generation_mode?: "topic" | "coverage";
  focus_topics?: string[]; // each <= 200 chars, list <= 10
  avoid_topics?: string[]; // each <= 200 chars, list <= 10
  extra_instructions?: string | null; // <= 1000 chars
  append?: boolean; // default false: replace existing questions
  coverage_options?: CoverageOptions | null;
}

export interface CoverageOptions {
  min_per_section?: number; // default 1, 0..10
  max_per_section?: number; // default 5, 1..10
  skip_summaries?: boolean; // default true
  section_ids?: string[] | null; // null = all sections
}

// --- Lesson outline preview (FR-3, FR-4) -----------------------------------

export interface OutlineSectionRead {
  id: string;
  title: string;
  depth: number;
  chunk_count: number;
  char_count: number;
  page_range: [number, number];
  content_role: "body" | "summary" | "review" | "front_matter";
  preview: string;
}

export interface LessonOutlineRead {
  lesson_id: string;
  lesson_title: string;
  sections: OutlineSectionRead[];
  suggested_question_count: number;
  min_for_full_coverage: number;
}

export interface QuizCreatePayload {
  title: string;
  description?: string | null;
  time_limit_seconds?: number | null;
  passing_score_percent?: string | null;
  allow_retakes?: boolean;
  max_attempts?: number | null;
  cooldown_hours?: number | null;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_hints?: boolean;
  initial_ef?: string | null;
  min_ef_for_unlock?: string | null;
  coverage_threshold?: string | null;
  reminders_enabled?: boolean;
  generation_instructions?: string | null;
}

export interface QuizRead {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  description: string | null;
  status: string;
  time_limit_seconds: number | null;
  passing_score_percent: string;
  allow_retakes: boolean;
  max_attempts: number | null;
  cooldown_hours: number | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_hints: boolean;
  initial_ef: string | null;
  min_ef_for_unlock: string | null;
  coverage_threshold: string | null;
  reminders_enabled: boolean;
  generation_instructions: string | null;
  generation_run_id: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestionRead {
  id: string;
  quiz_id: string;
  position: number;
  question_type: string;
  prompt_text: string;
  hint_text: string | null;
  explanation: string | null;
  difficulty: string | null;
  bloom_level: string | null;
  review_status: string;
  expected_response_ms: number;
  source_refs_json: unknown;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  options: QuizQuestionOptionRead[];
}

export interface QuizQuestionOptionRead {
  id: string;
  question_id: string;
  option_key: string;
  option_text: string;
  is_correct: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestionOptionPatch {
  id?: string | null;
  option_key?: string | null;
  option_text?: string | null;
  is_correct?: boolean | null;
}

export interface QuizQuestionOptionCreate {
  option_key: string;
  option_text: string;
  is_correct: boolean;
}

export interface QuizQuestionCreatePayload {
  question_type?: string;
  prompt_text: string;
  hint_text?: string | null;
  explanation?: string | null;
  difficulty?: string | null;
  bloom_level?: string | null;
  review_status?: string;
  expected_response_ms?: number;
  source_refs_json?: unknown;
  options?: QuizQuestionOptionCreate[];
}

export type QuizQuestionPatch = Partial<
  Pick<
    QuizQuestionRead,
    | "position"
    | "question_type"
    | "prompt_text"
    | "hint_text"
    | "explanation"
    | "difficulty"
    | "bloom_level"
    | "review_status"
    | "expected_response_ms"
    | "source_refs_json"
  >
> & { options?: QuizQuestionOptionPatch[] | null };

export interface UploadUrlResponse {
  storage_object: { id: string; object_key: string; bucket: string };
  upload_url: string;
  expires_at: string;
}

export interface LessonRead {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  summary: string | null;
  notes_markdown: string | null;
  primary_material_id: string | null;
  lesson_type: string;
  difficulty: string | null;
  estimated_minutes: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RosterStudent {
  enrollment_id: string;
  student_id: string;
  enrollment_status: string;
  enrolled_at: string;
  completed_at: string | null;
  dropped_at: string | null;
  primary_email: string;
  display_name: string;
  progress_percent: number;
  at_risk_level: string;
  last_activity_at: string | null;
  final_grade: string | null;
  // Short-TTL presigned GET URL for the student's uploaded avatar (minted
  // server-side). NULL when no avatar is set — the UI falls back to initials.
  avatar_url: string | null;
}

export interface CourseRoster {
  course_id: string;
  students: RosterStudent[];
}

export interface CourseEnrollmentRead {
  id: string;
  course_id: string;
  student_id: string;
  status: string;
  waitlist_position: number | null;
  source: string;
  invitation_code_id: string | null;
  enrolled_at: string;
  completed_at: string | null;
  dropped_at: string | null;
  created_at: string;
  updated_at: string;
}

export const LESSON_TYPES = [
  { value: "video", label: "Video" },
  { value: "reading", label: "Reading" },
] as const;
