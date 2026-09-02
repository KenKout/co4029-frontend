/**
 * Hand-curated re-exports of generated OpenAPI schemas.
 * Generated source: ./openapi-types.d.ts — regenerate via `npm run codegen:api`.
 */
import type { components, paths } from "./openapi-types";

type Schemas = components["schemas"];

// Teacher contact info shown on the student landing page (backend migration
// 0061). Augmented here rather than via the generated openapi types: the
// committed openapi-snapshot.json can't be regenerated in isolation right now
// without pulling in unrelated in-flight backend drift, so these four optional
// fields are layered on by hand until a coordinated snapshot refresh lands.
// The backend already serves + accepts them on all four course schemas.
export interface CourseContactFields {
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_website_url?: string | null;
  contact_social_url?: string | null;
}

// Course-scoped teacher TITLE FLAGS (user decision 2026-08-30): a course may
// have several Course Instructors and several Teacher Assistants, and one
// teacher may hold BOTH (defined in types-dept.ts and re-exported at the
// bottom of this file). The learner-facing `instructors` list carries them so
// the student page can label CI vs TA vs both. Layered by hand here rather
// than via the generated openapi types for the same reason as
// CourseContactFields — the committed openapi snapshot predates
// `instructors`. Keep in sync with backend public.InstructorRead.
/** Hand-authored addition to the generated public `InstructorRead`. */
export interface InstructorReadFields {
  is_instructor?: boolean | null;
  is_assistant?: boolean | null;
}

export type InstructorReadLocal = Schemas["InstructorRead"] &
  InstructorReadFields;

/** Hand-authored `instructors` list on the learner course payload. */
export interface CoursePublicFields {
  /** Every teacher on the course, Course Instructor first then TAs. */
  instructors?: InstructorReadLocal[];
  /** Where the course sits on career paths — the DERIVED "level" (shown as
   *  "Stage N — <title>"). Empty when the course is on no path. */
  career_paths?: CourseCareerPlacementPublic[];
}

export interface CourseCareerPlacementPublic {
  career_path_id: string;
  career_path_name: string;
  stage_id: string;
  stage_title?: string | null;
  stage_position: number;
}

// Difficulty / effort for the landing-page meta line, exposed on the public
// payload by backend CoursePublic (same hand-layered pattern as the contact
// fields above — the committed openapi snapshot predates them). The SPA shows
// them only when the backend fills them in.
export interface CoursePublicMeta {
  estimated_minutes?: number | null;
  /** True when the course has an archived syllabus PDF a student may download
   *  (`GET /courses/{id}/syllabus/download-url`). Hand-layered like the fields
   *  above; keep in sync with backend public.CoursePublic. */
  has_syllabus?: boolean | null;
}

export type Course = Schemas["CoursePublic"] &
  CourseContactFields &
  CoursePublicFields;
export type CoursePublic = Schemas["CoursePublic"] &
  CourseContactFields &
  CoursePublicMeta &
  CoursePublicFields;
export interface CourseFacultyFields {
  /** Immutable owning faculty; null means organization-wide. */
  faculty_id?: string | null;
}
export type CourseAuthoring = Omit<Schemas["CourseAuthoring"], "org_unit_id"> &
  CourseContactFields &
  CourseFacultyFields;
export type CourseCreate = Omit<Schemas["CourseCreate"], "org_unit_id"> &
  CourseContactFields &
  CourseFacultyFields;
export type CourseUpdate = Omit<Schemas["CourseUpdate"], "org_unit_id"> &
  CourseContactFields;
/** Manager-only course clone depth (user request 2026-08-18). Hand-authored
 * like ContactFields: the committed openapi snapshot predates the endpoint. */
export type CourseCloneDepth = "shell" | "structure" | "full";
export type CourseContent = Schemas["CourseContentPublic"];
export type CourseContentPublic = Schemas["CourseContentPublic"];
export type CourseProgressSummary = Schemas["CourseProgressSummary"];
export type CourseLearningOutcome = Schemas["CourseLearningOutcomePublic"];
export type CourseLearningOutcomePublic =
  Schemas["CourseLearningOutcomePublic"];
export type CourseLearningOutcomeAuthoring =
  Schemas["CourseLearningOutcomeAuthoring"];

// Teacher-curated, publishable knowledge graph (backend migration 0062).
// Hand-defined here rather than via generated openapi types for the same
// reason as the contact fields above: the committed openapi-snapshot.json
// can't be regenerated in isolation right now without pulling in unrelated
// in-flight backend drift. The backend already serves/accepts these shapes on
// the teacher (GET/PUT/publish) and learner (GET) curated-KG endpoints. Keep
// in sync with abridgeai/features/materials/schemas/curated_kg.py until a
// coordinated snapshot refresh lands.
export type CuratedKGRelation = "PREREQUISITE_OF" | "RELATED_TO";

export interface CuratedKGNode {
  id: string;
  label: string;
  type: string;
  definition?: string | null;
  weight: number;
  is_primary: boolean;
}

export interface CuratedKGEdge {
  source: string;
  target: string;
  relation: CuratedKGRelation;
}

// Request body for saving the draft (PUT).
export interface CuratedKGDraftSave {
  nodes: CuratedKGNode[];
  edges: CuratedKGEdge[];
}

// Teacher-facing read of the draft + publish state.
export interface CuratedKGDraft {
  lesson_id: string;
  exists: boolean;
  seeded: boolean;
  // True when the first-open seed was the fallback one-node "Main concept"
  // draft (AI graph off/empty). Such a draft is NOT publishable.
  seeded_placeholder: boolean;
  nodes: CuratedKGNode[];
  edges: CuratedKGEdge[];
  primary_node_id: string | null;
  is_published: boolean;
  published_at: string | null;
  has_unpublished_changes: boolean;
}

// Student-facing read of the PUBLISHED graph only.
export interface CuratedKGPublished {
  lesson_id: string;
  published: boolean;
  nodes: CuratedKGNode[];
  edges: CuratedKGEdge[];
  primary_node_id: string | null;
  published_at: string | null;
}

export type Module = Schemas["ModulePublic"];
export type ModulePublic = Schemas["ModulePublic"];
export type ModuleAuthoring = Schemas["ModuleAuthoring"];
export type ModuleCreate = Schemas["ModuleCreate"];
export type ModuleUpdate = Schemas["ModuleUpdate"];
export type ModulePrerequisiteSet = Schemas["ModulePrerequisiteSet"];
export type ModuleItem = Schemas["ModuleItemPublic"];
export type ModuleItemPublic = Schemas["ModuleItemPublic"];
export type ModuleItemAuthoring = Schemas["ModuleItemAuthoring"];
export type ModuleItemReorder = Schemas["ModuleItemReorder"];

export type Tag = Schemas["TagPublic"];
export type TagPublic = Schemas["TagPublic"];

export type InstructorRead = Schemas["InstructorRead"] & InstructorReadFields;

export type Lesson = Schemas["LessonPublic"];
export type LessonPublic = Schemas["LessonPublic"];
export type LessonAuthoring = Schemas["LessonAuthoring"];
export type LessonCreate = Schemas["LessonCreate"];
export type LessonUpdate = Schemas["LessonUpdate"];
export type LessonOverviewItem = Schemas["LessonOverviewItem"];
export type LessonProgress = Schemas["LessonProgressPublic"];
export type LessonProgressPublic = Schemas["LessonProgressPublic"];
export type LessonProgressSummary = Schemas["LessonProgressSummary"];
export type MyCourseProgressSummary = Schemas["MyCourseProgressSummary"];
export type RosterProgressRead = Schemas["RosterProgressRead"];
export type AtRiskListRead = Schemas["AtRiskListRead"];
export type LessonResource = Schemas["LessonResourcePublic"];
export type LessonResourcePublic = Schemas["LessonResourcePublic"];
export type LessonResourceAuthoring = Schemas["LessonResourceAuthoring"];
export type LessonResourceCreate = Schemas["LessonResourceCreate"];

export type ResourceDownloadUrlResponse =
  Schemas["ResourceDownloadUrlResponse"];

export type Material = Schemas["MaterialPublic"];
export type MaterialPublic = Schemas["MaterialPublic"];
export type MaterialAuthoring = Schemas["MaterialAuthoring"];
export type MaterialVersionAuthoring = Schemas["MaterialVersionAuthoring"];
export type MaterialUpdate = Schemas["MaterialUpdate"];
export type MaterialEngagement = Schemas["MaterialEngagementPublic"];
export type MaterialEngagementPublic = Schemas["MaterialEngagementPublic"];
export type MaterialEngagementCreate = Schemas["MaterialEngagementCreate"];
export type MaterialStreamUrl = Schemas["MaterialStreamUrl"];
export type ChunkPreview = Schemas["ChunkPreview"];

export type MaterialUploadInit = Schemas["MaterialUploadInit"];
export type MaterialUploadInitOut = Schemas["MaterialUploadInitOut"];
export type MaterialUploadComplete = Schemas["MaterialUploadComplete"];
export type UploadCompleteOut = Schemas["UploadCompleteOut"];
export type MultipartPartsOut = Schemas["MultipartPartsOut"];
export type MultipartCompleteIn = Schemas["MultipartCompleteIn"];
export type MultipartAbortIn = Schemas["MultipartAbortIn"];
export type ReprocessOut = Schemas["ReprocessOut"];
export type ProcessingProgress = Schemas["ProcessingProgress"];

/**
 * Scheduling window (backend migration 0032). These fields post-date the
 * committed OpenAPI snapshot, so augment locally until the snapshot is
 * regenerated against the live backend at deploy time (an all-optional
 * intersection stays compatible with the eventual generated shape).
 * NULL = no restriction. `due_at` is a soft deadline (does not block).
 */
export interface QuizScheduleWindow {
  available_from?: string | null;
  available_until?: string | null;
  due_at?: string | null;
  review_options?: Record<string, unknown> | null;
  require_password?: string | null;
  require_subnet?: string | null;
  browser_security?: boolean | null;
  overdue_handling?: "autosubmit" | "graceperiod" | "autoabandon" | null;
  grace_period_seconds?: number | null;
}

export type Quiz = Schemas["QuizPublic"] & QuizScheduleWindow;
export type QuizPublic = Schemas["QuizPublic"] & QuizScheduleWindow;
export type QuizAuthoring = Schemas["QuizAuthoring"] & QuizScheduleWindow;
export type QuizForTaking = Schemas["QuizForTakingPublic"];
export type QuizForTakingPublic = Schemas["QuizForTakingPublic"];
export type QuizForAuthoring = Schemas["QuizForAuthoringPublic"];
export type QuizForAuthoringPublic = Schemas["QuizForAuthoringPublic"];
export type QuizAttempt = Schemas["QuizAttemptRead"];
// Hand-layered (snapshot can't be regenerated in isolation — see
// CourseContactFields): the learner quiz-progress endpoint landed in
// backend a5334c0 and isn't in the committed openapi snapshot yet.
export interface QuizProgressRead {
  quiz_id: string;
  attempts_used: number;
  max_attempts: number | null;
  allow_retakes: boolean;
  passed: boolean | null;
  grade_percent: number | null;
  completed: boolean;
  attempts_remaining: number | null;
}
// Hand-layered for the same reason as QuizProgressRead above: the learner
// interview-progress endpoint landed in backend 2f21c9e and isn't in the
// committed openapi snapshot yet.
//
// Completion rule differs from quizzes ON PURPOSE (user decision 2026-08-06):
// `completed` is true only when at least one attempt PASSED. A
// quiz also completes on failed-with-attempts-exhausted; an interview does
// not, so the tag reads as "passed" and a student who failed every attempt
// keeps the item pending.
//
// `attempts_awaiting_grade` counts only completed/timed-out attempts awaiting
// evaluation. It excludes abandoned and system-failed rows, which never receive
// a verdict.
export interface InterviewProgressRead {
  interview_config_id: string;
  attempts_used: number;
  attempts_in_flight: number;
  attempts_graded: number;
  attempts_awaiting_grade: number;
  passed: boolean;
  completed: boolean;
}
export type QuizAttemptRead = Schemas["QuizAttemptRead"];
export type QuizAttemptReviewRead = Schemas["QuizAttemptReviewRead"];
export type QuizAttemptReviewQuestion = Schemas["QuizAttemptReviewQuestion"];
export type QuizAttemptReviewOption = Schemas["QuizAttemptReviewOption"];
// The committed OpenAPI snapshot predates the Phase-12 access-password gate,
// so widen QuizAttemptStart with the optional `password` the backend accepts
// on POST /quizzes/{id}/attempts until the snapshot is regenerated.
export type QuizAttemptStart = Schemas["QuizAttemptStart"] & {
  password?: string | null;
};
export type QuizAttemptSubmitAnswer = Schemas["QuizAttemptAnswerInput"];
export type QuizAttemptAnswerRead = Schemas["QuizAttemptAnswerRead"];
/**
 * Rich-content format discriminators (backend Phase 3, migration 0044) +
 * expanded question-type fields (Phase 7, migration 0051). These post-date the
 * committed OpenAPI snapshot, so augment locally until it is regenerated.
 * All-optional so the shape stays compatible with the eventual generated type.
 */
export type RichFormat = "plain" | "markdown" | "html";
export interface QuizQuestionRichFields {
  // The format fields are typed as plain string: attempt/question payloads
  // carry them as strings throughout the FE, and the backend validates the
  // literal values at runtime (RichFormat above documents the allowed set).
  prompt_format?: string | null;
  hint_format?: string | null;
  explanation_format?: string | null;
  // Phase 7 expanded types.
  single_answer?: boolean | null;
  numeric_answer?: number | string | null;
  numeric_tolerance?: number | string | null;
  // The generated OpenAPI shape carries match_pairs as loose dicts; readers
  // cast to { left, right } where they render (PreviewAnswer, helpers).
  match_pairs?: Array<Record<string, unknown>> | null;
  // Matching distractors: extra right-side choices with no left partner. The
  // backend folds these into the shuffled match_choices pool served to
  // students; teacher-only as a raw list.
  match_distractors?: string[] | null;
  // Generated shape carries unknown[] (backend list of scalars); readers cast.
  ordering_sequence?: unknown[] | null;
  // No-leak derived projections served to students (backend Phase 7). The raw
  // answer keys above are teacher-only; these shuffled lists are what a learner
  // renders/answers against. match_prompts = left column (in order),
  // match_choices = right values (shuffled), ordering_items = items (shuffled).
  match_prompts?: string[] | null;
  match_choices?: string[] | null;
  ordering_items?: string[] | null;
}
export interface QuizQuestionOptionRichFields {
  option_format?: RichFormat | null;
}

/**
 * The question types the platform actually supports.
 *
 * The committed OpenAPI snapshot predates Phase 7, so its generated
 * `question_type` literal stops at `code` and omits `numerical` / `matching` /
 * `ordering`. An `&` intersection cannot WIDEN an existing literal (it would
 * intersect to `never`), so the field is `Omit`ted and redeclared below —
 * otherwise every `question.question_type === "matching"` comparison is a
 * compile error and needs an `as string` cast at each site.
 *
 * Delete this once the snapshot is regenerated against the live backend.
 */
export type QuizQuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "fill_blank"
  | "code"
  | "numerical"
  | "matching"
  | "ordering";

type WithQuestionType<T> = Omit<T, "question_type"> & {
  question_type: QuizQuestionType;
};

export type QuizQuestion = WithQuestionType<Schemas["QuizQuestionPublic"]> &
  QuizQuestionRichFields;
export type QuizQuestionPublic = WithQuestionType<
  Schemas["QuizQuestionPublic"]
> &
  QuizQuestionRichFields;
export type QuizQuestionAuthoring = WithQuestionType<
  Schemas["QuizQuestionAuthoring"]
> &
  QuizQuestionRichFields;
export type QuizQuestionOptionPublic = Schemas["QuizQuestionOptionPublic"] &
  QuizQuestionOptionRichFields;
export type QuizQuestionOptionAuthoring =
  Schemas["QuizQuestionOptionAuthoring"] & QuizQuestionOptionRichFields;
export type QuestionBankEntry = Schemas["QuestionBankEntry"];
export type QuestionBankImportRequest = Schemas["QuestionBankImportRequest"];

export type QuizQuestionBankStatus = "draft" | "approved" | "archived";

export interface QuizQuestionBankOption {
  id: string;
  option_key: string;
  option_text: string;
  is_correct: boolean;
  position: number;
  option_format: string;
  grade_fraction?: string | number | null;
  feedback_text?: string | null;
  feedback_format?: string | null;
}

export interface QuizQuestionBankItem {
  id: string;
  course_id: string;
  source_question_id?: string | null;
  status: QuizQuestionBankStatus;
  content_hash: string;
  question_type: QuizQuestionAuthoring["question_type"];
  prompt_text: string;
  hint_text?: string | null;
  explanation?: string | null;
  difficulty?: "easy" | "medium" | "hard" | null;
  bloom_level?:
    | "remember"
    | "understand"
    | "apply"
    | "analyze"
    | "evaluate"
    | "create"
    | null;
  expected_response_time_ms?: number | null;
  expected_ef_ceiling?: string | number | null;
  learning_outcome_id?: string | null;
  source_refs?: unknown[];
  original_generated_payload?: Record<string, unknown> | null;
  prompt_format?: string;
  hint_format?: string;
  explanation_format?: string;
  single_answer?: boolean;
  answer_numbering?: string;
  numeric_answer?: string | number | null;
  numeric_tolerance?: string | number | null;
  match_pairs?: Array<Record<string, unknown>> | null;
  match_distractors?: string[] | null;
  ordering_sequence?: unknown[] | null;
  category_id?: string | null;
  options: QuizQuestionBankOption[];
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type QuizQuestionBankItemCreate = Omit<
  QuizQuestionBankItem,
  | "id"
  | "course_id"
  | "source_question_id"
  | "content_hash"
  | "created_by"
  | "updated_by"
  | "created_at"
  | "updated_at"
  | "options"
> & {
  options?: Array<Omit<QuizQuestionBankOption, "id">>;
};

export type QuizQuestionBankItemUpdate = Partial<
  Omit<QuizQuestionBankItemCreate, "status">
>;

export type GenerationRunRead = Schemas["QuizGenerationRunRead"];
export type QuizGenerationRunRead = Schemas["QuizGenerationRunRead"];
export type QuizGenerationRequest = Schemas["QuizGenerationRequest"];
export type QuizGenerationProgress = Schemas["QuizGenerationProgress"];
export type QuizGenerationStageEvent = Schemas["QuizGenerationStageEvent"];
export type BulkSetExpectedTimeRequest = Schemas["BulkSetExpectedTimeRequest"];
export type BulkSetExpectedTimeResponse =
  Schemas["BulkSetExpectedTimeResponse"];
export type BulkSetItem = Schemas["BulkSetItem"];

export type InterviewConfigPublic = Schemas["InterviewConfigPublic"];
// Widen with published_at (last-published timestamp) until the OpenAPI
// snapshot is regenerated.
export type InterviewConfigAuthoring = Schemas["InterviewConfigAuthoring"] & {
  published_at?: string | null;
  // Resolved persona traits (preset merged with overrides) — teacher-only.
  // Manually typed until the OpenAPI snapshot is regenerated (Phase 3).
  persona_profile_resolved?: PersonaProfileRead | null;
};
export type InterviewConfigCreate = Schemas["InterviewConfigCreate"] & {
  persona_profile?: PersonaProfileWrite | null;
};
export type InterviewConfigUpdate = Schemas["InterviewConfigUpdate"] & {
  persona_profile?: PersonaProfileWrite | null;
};
export type InterviewForTakingPublic = Schemas["InterviewForTakingPublic"] & {
  config: InterviewConfigPublic;
};
export type InterviewSessionPublic = Schemas["InterviewSessionPublic"] & {
  // Proactive retake context (#7) — manually typed until the OpenAPI snapshot
  // is regenerated. remaining_attempts is null when unlimited; retake_available_at
  // is null when no cooldown is active.
  remaining_attempts?: number | null;
  retake_available_at?: string | null;
  can_retake?: boolean;
};
export type InterviewSessionStartRequest =
  Schemas["InterviewSessionStartRequest"];
export type InterviewLanguage = NonNullable<
  Schemas["InterviewOnboardingRespondRequest"]["language"]
>;
export type InterviewOnboardingStage =
  Schemas["InterviewOnboardingRespondResponse"]["onboarding_stage"];
export type InterviewSessionHistoryTurn =
  Schemas["InterviewSessionHistoryTurn"];
export type InterviewSessionStartResponse =
  Schemas["InterviewSessionStartResponse"] & {
    onboarding_stage?: InterviewOnboardingStage;
    interview_language?: InterviewLanguage;
    assessment_started_at?: string | null;
  };
// The generated schema is regenerated from the backend OpenAPI doc; until that
// regen runs, widen the union to include the in-session identity-correction
// actions the backend already accepts (reject_identity / set_name).
export type InterviewOnboardingAction =
  | NonNullable<Schemas["InterviewOnboardingRespondRequest"]["action"]>
  | "reject_identity"
  | "set_name"
  | "skip_setup";
export type InterviewOnboardingRespondRequest = Omit<
  Schemas["InterviewOnboardingRespondRequest"],
  "action"
> & {
  // Widen action to include the in-session identity-correction actions the
  // backend accepts but the generated schema hasn't been regenerated for yet.
  action?: InterviewOnboardingAction | null;
};
export type InterviewOnboardingRespondResponse =
  Schemas["InterviewOnboardingRespondResponse"];
export type InterviewSessionFinishResponse =
  Schemas["InterviewSessionFinishResponse"] & {
    // Proactive retake context (#7) — manually typed until the OpenAPI snapshot
    // is regenerated.
    remaining_attempts?: number | null;
    retake_available_at?: string | null;
    can_retake?: boolean;
  };
export interface InterviewSessionFinishRequest {
  reason?: "natural" | "ended_early" | "timed_out";
}
export type InterviewRespondRequest = Schemas["InterviewSubmitAnswerRequest"];
export type InterviewSubmitAnswerRequest =
  Schemas["InterviewSubmitAnswerRequest"];
// Widen with the Natural Interview Transitions fields until the OpenAPI
// snapshot is regenerated — the backend already returns these additive,
// optional fields (transition text/id/target) on an advance or final turn.
export type InterviewSubmitAnswerResponse =
  Schemas["InterviewSubmitAnswerResponse"] & {
    transition_id?: string | null;
    transition_text?: string | null;
    transition_target?: "next_question" | "closing" | null;
    // End-confirmation gate (Slice 4): the backend asks the candidate to
    // confirm ending rather than closing immediately. `pending_confirmation`
    // is true on a `request_end_confirmation` turn and stays true until the
    // candidate confirms/cancels; `interaction_state` exposes the per-turn
    // lifecycle axis (separate from interview progress/phase).
    pending_confirmation?: boolean | null;
    interaction_state?: string | null;
  };
export type InterviewQuestionPublic = Schemas["InterviewQuestionPublic"];
// Widen with source_module_ids (module attribution) and variant_group_id
// (all-angle logical-question grouping) until the OpenAPI snapshot is regenerated.
export type InterviewQuestionAuthoring =
  Schemas["InterviewQuestionAuthoring"] & {
    source_module_ids?: string[];
    variant_group_id?: string | null;
  };
export type InterviewQuestionCreate = Schemas["InterviewQuestionCreate"];

// Advisory duplicate check run before saving an authored question. Manually
// typed until the OpenAPI snapshot is regenerated; mirrors
// abridgeai/features/interviews/schemas/authoring.py.
export interface InterviewQuestionDuplicateCheckRequest {
  prompt_text: string;
  /** Set when editing, so the question is not matched against itself. */
  exclude_question_id?: string | null;
}
/**
 * Three distinct outcomes share one shape, so read the flags in order:
 * `enabled === false` (feature off) and `error !== ""` (check failed) both
 * report `is_duplicate: false` without having actually cleared the question.
 * Only `enabled && !error && !is_duplicate` means "genuinely not a duplicate".
 */
export interface InterviewQuestionDuplicateCheck {
  enabled: boolean;
  is_duplicate: boolean;
  duplicate_of_id: string | null;
  duplicate_of_text: string;
  rationale: string;
  error: string;
}

export type InterviewOutcomeAuthoring = Schemas["InterviewOutcomeAuthoring"];
export type InterviewOutcomeCreate = Schemas["InterviewOutcomeCreate"];
// Widen with source_module_ids until the OpenAPI snapshot is regenerated.
// `mode` is Omit-ted: the backend dropped it (2026-08-30, no stage read it)
// and the model is extra="forbid", so sending it would 422.
export type InterviewGenerationRequest = Omit<Schemas["InterviewGenerationRequest"], "mode"> & {
  source_module_ids?: string[];
  target_outcome_ids?: string[];
  variant_strategy?: "all_angles" | "role_only" | null;
};
export type InterviewGenerationRunPublic =
  Schemas["InterviewGenerationRunPublic"];
export type GapReportRead = Schemas["GapReportRead"];

// Course-scoped interview question bank (§QBank-1). Manually typed until the
// OpenAPI snapshot is regenerated; matches the backend authoring schemas.
export type InterviewQuestionType =
  Schemas["InterviewQuestionCreate"]["question_type"];
export type InterviewDifficulty = NonNullable<
  Schemas["InterviewQuestionCreate"]["difficulty"]
>;
export interface InterviewQuestionBankItemRead {
  id: string;
  course_id: string;
  prompt_text: string;
  question_type: InterviewQuestionType;
  difficulty?: InterviewDifficulty | null;
  model_answer?: string | null;
  variant_group_id?: string | null;
  source_config_id?: string | null;
  created_at: string;
  updated_at: string;
}
export interface InterviewQuestionBankItemCreate {
  prompt_text: string;
  question_type: InterviewQuestionType;
  difficulty?: InterviewDifficulty | null;
  model_answer?: string | null;
  source_config_id?: string | null;
}
export interface InterviewQuestionBankLogicalGroupCreate {
  items: [
    InterviewQuestionBankItemCreate,
    InterviewQuestionBankItemCreate,
    InterviewQuestionBankItemCreate,
    InterviewQuestionBankItemCreate,
  ];
}
export interface InterviewQuestionBankImportResult {
  created: InterviewQuestionAuthoring[];
  imported_group_count: number;
}
export interface InterviewQuestionBankItemUpdate {
  prompt_text?: string;
  question_type?: InterviewQuestionType;
  difficulty?: InterviewDifficulty | null;
  model_answer?: string | null;
}
// Widen with the teacher-context fields the backend already returns
// (student_name, interview_title) until the OpenAPI snapshot is regenerated.
export type GapReportAuthoringRead = Schemas["GapReportAuthoringRead"] & {
  student_name?: string | null;
  interview_title?: string | null;
  // Tone-only persona-adherence audit (teacher diagnostic). Present only when a
  // session was audited; absent/empty otherwise. Manually typed until the
  // OpenAPI snapshot is regenerated.
  persona_adherence?: PersonaAdherenceRead;
};

// Persona-adherence audit result surfaced from internal_summary_json. Every
// field is optional so a partial/legacy payload never breaks the render.
// Resolved persona profile (preset merged with teacher per-trait overrides),
// returned on the teacher authoring projection (Phase 3). Traits are 0-4 dials.
// Manually typed until the OpenAPI snapshot is regenerated.
export interface PersonaProfileRead {
  key: string;
  warmth: number;
  directness: number;
  verbosity: number;
  formality: number;
  ack_frequency: number;
  opening_style: "brief" | "standard" | "comfort";
}

// Optional per-trait persona overrides written on a config (Phase 3). Every
// field optional so a teacher can nudge one dial and leave the rest to the
// preset. Sent on POST/PATCH /teacher/interview-configs.
export interface PersonaProfileWrite {
  warmth?: number | null;
  directness?: number | null;
  verbosity?: number | null;
  formality?: number | null;
  ack_frequency?: number | null;
  opening_style?: "brief" | "standard" | "comfort" | null;
}

export interface PersonaAdherenceRead {
  tone_consistency?: number;
  reasoning?: string;
  warmth_observed?: number;
  directness_observed?: number;
  verbosity_observed?: number;
  formality_observed?: number;
  drift_turns?: number[];
  violations?: string[];
  available?: boolean;
}

export interface InterviewForAuthoringPublic {
  config: InterviewConfigAuthoring;
  questions: InterviewQuestionAuthoring[];
  outcomes: InterviewOutcomeAuthoring[];
}

export interface InterviewSessionSummary {
  session_id: string;
  student_id: string;
  student_name: string | null;
  attempt_number: number;
  status: "in_progress" | "completed" | "timed_out" | "abandoned" | "failed";
  input_mode: "voice" | "text" | "hybrid";
  pass_verdict: boolean | null;
  started_at: string;
  ended_at: string | null;
}

export type InterviewSessionTeacherRead =
  Schemas["InterviewSessionTeacherRead"];
export type QuizAttemptTeacherRead = Schemas["QuizAttemptTeacherRead"];

// Teacher quiz results & analytics dashboard (GET /teacher/quizzes/{id}/results).
export type QuizResultsRead = Schemas["QuizResultsRead"];
export type QuizResultsSummary = Schemas["QuizResultsSummary"];
export type QuizScoreBucket = Schemas["QuizScoreBucket"];
export type QuizPerStudentRow = Schemas["QuizPerStudentRow"];
export type QuizQuestionBreakdown = Schemas["QuizQuestionBreakdown"];
export type QuizOptionDistribution = Schemas["QuizOptionDistribution"];

export interface InterviewTranscriptTurn {
  role: "user" | "ai" | "system";
  question_prompt: string | null;
  content_text: string | null;
  has_audio: boolean;
  created_at: string;
}

export interface InterviewTranscriptRead {
  session_id: string;
  turns: InterviewTranscriptTurn[];
}
export type StudyPlanItem = Schemas["StudyPlanItem"];

export type Enrollment = Schemas["EnrollmentRead"];
export type EnrollmentRead = Schemas["EnrollmentRead"];
export type EnrollmentAuthoring = Schemas["EnrollmentAuthoring"];

// TeacherAssignmentRead / AssignTeacherRequest are hand-augmented in
// types-dept.ts (the generated snapshot predates the teacher-titles flags) and re-exported
// from here.
export type TeacherAssignmentCreated = Schemas["TeacherAssignmentCreated"];
export type RosterEntry = Schemas["RosterEntry"];
export type BulkEnrollResult = Schemas["BulkEnrollResult"];
export type BulkEnrollFailure = Schemas["BulkEnrollFailure"];
export type InvitationCodeCreate = Schemas["InvitationCodeCreate"];
export type InvitationCodeAuthoring = Schemas["InvitationCodeAuthoring"];
export type InvitationCodePatch = Schemas["InvitationCodePatch"];
export type CSVImportPayload = Schemas["CSVImportPayload"];

// action_url is a precomputed relative deep-link built by the producing
// feature (backend Option B). Extended manually until the OpenAPI snapshot
// is regenerated — the generated NotificationRead doesn't carry it yet.
export type Notification = Schemas["NotificationRead"] & {
  action_url?: string | null;
};
export type NotificationPreference = Schemas["NotificationPreferenceRead"];
export type NotificationPreferenceRead = Schemas["NotificationPreferenceRead"];
export type NotificationPreferenceUpdate =
  Schemas["NotificationPreferenceUpdate"];

/**
 * Notification category literals.
 *
 * The OpenAPI schema surfaces `category` as a free-form string, but the
 * backend ships a fixed set of categories. We pin them as a literal union for
 * exhaustive matrix rendering and Vietnamese-label maps. Keep this in sync
 * with the backend CHECK constraint (notifications.models) and the
 * `notifications.category.*` / `settings_notifications.category.*` i18n keys.
 */
export type NotificationCategory =
  | "spaced_repetition"
  | "lesson_unlock"
  | "interview_result"
  | "course_announcement"
  | "system"
  | "material_processing"
  | "quiz_generation"
  | "interview_generation"
  | "path_change_review";

export type NotificationChannel = "email" | "in_app";

export type User = Schemas["UserRead"];
export type UserProfile = Schemas["UserProfileRead"];
export type UserProfileUpdate = Schemas["UserProfileUpdate"];
export type UserListRow = Schemas["UserListRow"];
export type UserListPage =
  Schemas["abridgeai__features__identity__schemas__profile__UserListPage"];
export type MyPermissions = Schemas["UserPermissionsRead"];
export type GoogleLoginResponse = Schemas["GoogleLoginResponse"];
export type TokenResponse = Schemas["TokenResponse"];

export type MfaEnrollResponse = Schemas["MfaEnrollResponse"];
export type MfaChallengeResponse = Schemas["MfaChallengeResponse"];
export type MfaStatusResponse = Schemas["MfaStatusResponse"];
export type MfaDisableRequest = Schemas["MfaDisableRequest"];
export type MfaRecoveryCodesResponse = Schemas["MfaRecoveryCodesResponse"];
export type MfaTotpVerifyRequest = Schemas["MfaTotpVerifyRequest"];
export type MfaVerifyRequest = Schemas["MfaVerifyRequest"];

export type OverviewOut = Schemas["OverviewOut"];
export type ActiveUsersOut = Schemas["ActiveUsersOut"];
export interface ActiveUsersTrendPoint {
  date: string;
  count: number;
}
export interface ActiveUsersTrendOut {
  points: ActiveUsersTrendPoint[];
}

export interface LatencyTrendPoint {
  day: string;
  requests_total: number;
  p50_latency_ms: number | null;
  p95_latency_ms: number | null;
}

export interface LatencyTrendOut {
  points: LatencyTrendPoint[];
}
export type ContentOut = Schemas["ContentOut"];

export type AdminCoursePage = Schemas["AdminCoursePage"];
export type CourseProcessingAudit = Schemas["CourseProcessingAudit"];
export type CourseStats = Schemas["CourseStats"];
export type ProcessingJobRow = Schemas["ProcessingJobRow"];
export type ProcessingJobOut = Schemas["ProcessingJobOut"];
export type ProcessingQueueDepth = Schemas["QueueDepthOut"];
export type DisableUserOut = Schemas["DisableUserOut"];
export type EnableUserOut = Schemas["EnableUserOut"];

export type AiCostsSummary = Schemas["SummaryOut"];
export type AiCostsTotals = Schemas["CostTotals"];
export type AiCostsRoleBreakdown = Schemas["RoleBreakdown"];
export type AiCostsStageBreakdown = Schemas["StageBreakdown"];
export type AiCostsTimeBucket = Schemas["TimeBucket"];
export type AiCostsByUser = Schemas["UserSpendOut"];
export type AiCostsByPipeline = Schemas["PipelineSpendOut"];
export type AiCostsByCategory = Schemas["CategorySpendOut"];
export type AiCostsByModel = Schemas["ModelEfficiencyOut"];
export type AiCostsFailedSpend = Schemas["FailedSpend"];
export type AiModelPricing = Schemas["ModelPricingOut"];
export type AiCostsPipelineStage = Schemas["PipelineStage"];
export type AiCostsRecentCall = Schemas["RecentCallOut"];
export type AiCallRecord = Schemas["RecentCallOut"];

export type CareerPathPublic = Schemas["CareerPathPublic"];
export type CareerPathCoursePublic = Schemas["CareerPathCoursePublic"];
export type CareerPathAuthoring = Schemas["CareerPathAuthoring"] & {
  /** Path-level attention cap (backend migration 0070). NULL = unlimited. */
  max_concurrent?: number | null;
  /** Stage count for the management list table (backend-enriched). */
  stage_count?: number;
  /** Attached-course count for the management list table (backend-enriched). */
  course_count?: number;
};
export type CareerPathCreate = Schemas["CareerPathCreate"];
export type CareerPathUpdate = Schemas["CareerPathUpdate"] & {
  /** Path-level attention cap (backend migration 0070). */
  max_concurrent?: number | null;
  slug?: string;
};
export type CareerPathCourseReorder = Schemas["CareerPathCourseReorder"];
export type CareerPathStudentEnroll = Schemas["CareerPathStudentEnroll"];

// Gap 3 §2.1 — blast radius of editing a published path (GET
// /management/career-paths/{id}/impact). Hand-defined: the committed
// openapi snapshot predates this endpoint.
export interface CareerPathImpactStage {
  stage_id: string;
  position: number;
  title?: string | null;
  students_in_stage: number;
  students_not_completed: number;
}
export interface CareerPathImpactRead {
  career_path_id: string;
  active_enrollments: number;
  stages: CareerPathImpactStage[];
}
export interface CareerPathVersionRead {
  id: string;
  career_path_id: string;
  version_no: number;
  status: "draft" | "published";
  published_at?: string | null;
  created_at: string;
  created_by?: string | null;
  published_by?: string | null;
  published_by_name?: string | null;
}

// Career-path STAGES (backend migration 0070). Hand-defined here for the same
// reason as the curated-KG + contact shapes above: the committed
// openapi-snapshot.json can't be regenerated in isolation right now without
// pulling in unrelated in-flight backend drift. The backend already serves and
// accepts these shapes on the management stage routes and the learner
// progress/start routes. Keep in sync with
// abridgeai/features/career_paths/schemas/{authoring,public}.py until a
// coordinated snapshot refresh lands.
export type CareerPathUnlockPolicy =
  | "always"
  | "after_previous"
  | "after_previous_required";
export type CareerPathStageEnforcement = "hard" | "soft" | "advisory";
export type CareerPathSatisfiedBy = "completion";

export interface CareerPathStageAuthoring {
  id: string;
  career_path_id: string;
  position: number;
  /** NULL means unnamed — render `Stage {position}` via i18n, never a
   *  server-side English default. */
  title: string | null;
  description: string | null;
  min_optional_to_complete: number;
  unlock_policy: CareerPathUnlockPolicy;
  enforcement: CareerPathStageEnforcement;
  course_count: number;
}

export interface CareerPathStageCreate {
  title?: string | null;
  description?: string | null;
  position?: number | null;
  min_optional_to_complete?: number;
  unlock_policy?: CareerPathUnlockPolicy;
  enforcement?: CareerPathStageEnforcement;
}

export type CareerPathStageUpdate = Partial<{
  title: string | null;
  description: string | null;
  min_optional_to_complete: number;
  unlock_policy: CareerPathUnlockPolicy;
  enforcement: CareerPathStageEnforcement;
}>;

/** Reorder WARNS instead of rewriting unlock_policy — surface these to the
 *  manager rather than swallowing them. */
export interface CareerPathStageReorderWarning {
  stage_id: string;
  code:
    | "stage_becomes_implicitly_unlocked"
    | "stage_may_become_locked"
    | string;
  message: string;
}

export interface CareerPathStageReorderResult {
  stages: CareerPathStageAuthoring[];
  warnings: CareerPathStageReorderWarning[];
}

export type CareerPathCourseAuthoring = Schemas["CareerPathCourseAuthoring"] & {
  stage_id: string;
  satisfied_by: CareerPathSatisfiedBy;
};

export type CareerPathCourseAdd = Schemas["CareerPathCourseAdd"] & {
  stage_id: string;
  satisfied_by?: CareerPathSatisfiedBy;
};

export interface CareerPathCourseMove {
  stage_id: string;
  position?: number | null;
}

export type CourseProgressSummaryWithStage =
  Schemas["CourseProgressSummary"] & {
    stage_id?: string | null;
    is_required?: boolean;
    /** `course_enrollments.status === 'completed'` — NOT completion_percent>=100. */
    satisfied?: boolean;
    is_enrolled?: boolean;
    /**
     * Gradeable units in the course: lessons + quizzes + interviews. 0 means the
     * course can never be completed (the publish gate rejects such a course).
     *
     * `completion_percent` on the generated shape is a percentage of these units,
     * not a lesson average — the same measure `satisfied` is decided by. These
     * counts expose the numerator/denominator so the UI can show "4/6 done"
     * instead of only a bar. Keep in sync with
     * abridgeai/features/career_paths/schemas/public.py.
     */
    unit_total?: number;
    unit_done?: number;
  };

export interface StageProgressRead {
  stage_id: string;
  position: number;
  title: string | null;
  description: string | null;
  min_optional_to_complete: number;
  unlock_policy: CareerPathUnlockPolicy;
  enforcement: CareerPathStageEnforcement;
  /** Stage 1 is always unlocked whatever its stored policy says. */
  unlocked: boolean;
  complete: boolean;
  /** Latched in student_stage_progress — completion never goes backward. */
  latched: boolean;
  required_count: number;
  satisfied_required: number;
  optional_count: number;
  satisfied_optional: number;
  stage_total: number;
  stage_done: number;
  courses: CourseProgressSummaryWithStage[];
}

// Dept/manager course types live in their own module — this file hit the
// 800-line eslint cap. Re-exported so importers need not know that.
export type {
  AssignableTeacher,
  AssignTeacherRequest,
  CoursePathPlacement,
  CourseReadiness,
  CourseTeacherRole,
  TeacherAssignmentRead,
} from "./types-dept";

export interface StartCourseResult {
  course_id: string;
  stage_id: string;
  /** false when an enrollment already existed — Start is idempotent. */
  created: boolean;
  /** Advisory only; the attention cap never blocks. */
  over_concurrency_cap: boolean;
  /**
   * The stage is LOCKED but its enforcement is not 'hard', so the Start was
   * allowed anyway. Only 'hard' blocks (403) — 'soft' warns and 'advisory' is
   * display-only. Surface this or the student is never told they are working
   * ahead of the path.
   */
  stage_locked_warning?: boolean;
  /**
   * Courses of this path the caller has active, counted AFTER this Start. The
   * cap warning interpolates it — do NOT hardcode a count, that shipped once
   * and rendered "you have 0 courses open in this path".
   */
  active_in_path?: number;
  /** The path's attention cap, or null when unset. Advisory: never blocks. */
  max_concurrent?: number | null;
}

export type CareerPathProgressRead = Schemas["CareerPathProgressRead"] & {
  stages?: StageProgressRead[];
  formula_version?: number;
  max_concurrent?: number | null;
  active_in_path?: number;
  over_concurrency_cap?: boolean;
  courses: CourseProgressSummaryWithStage[];
};
/**
 * The enrollment list contract does not require aggregate progress. Some
 * deployments enrich the same response with these values, while the learner
 * page deliberately falls back to 0% / completed status when they are absent.
 * Keep that progressive enhancement optional instead of weakening the
 * generated OpenAPI schema itself.
 */
export type MyCareerEnrollmentRead = Schemas["MyCareerEnrollmentRead"] & {
  overall_percent?: number | null;
  is_prepared?: boolean | null;
};
export type StudentPathProgressAuthoring =
  Schemas["StudentPathProgressAuthoring"];
export type PathReadinessOverview = Schemas["PathReadinessOverview"];
export type CareerReadinessSnapshotRead =
  Schemas["CareerReadinessSnapshotRead"];

export type CardDueItem = Schemas["CardsDueItem"];
// Was widened by hand while the snapshot lagged behind the course_slug /
// course_title enrichment. The snapshot now carries both (plus lesson_slug),
// so the alias is a straight re-export again — a hand-written widening
// silently absorbs future drift instead of surfacing it.
export type CardDue = CardDueItem;
export type CardsDuePage = Schemas["CardsDuePage"];

// -- SR review loop (post-snapshot; declared locally) --
export interface ReviewCard {
  question_id: string;
  quiz_id: string;
  lesson_id: string;
  lesson_title: string;
  course_slug: string;
  course_title: string;
  due_at: string;
  ef: number;
  last_q: number | null;
  question: QuizQuestionPublic;
}
export interface ReviewQueue {
  items: ReviewCard[];
  total_due: number;
  /** Admin daily review cap; 0 = unlimited. Bounds the queue only. */
  daily_cap: number;
  /** Cards already reviewed today (counts toward the cap). */
  reviewed_today: number;
  /** Cards still allowed today; 0 with total_due > 0 = capped out. */
  daily_remaining: number;
}
export interface ReviewSubmitRequest {
  selected_option_id?: string | null;
  answer_text?: string | null;
  hint_used?: boolean;
  t_actual_ms?: number | null;
}
export interface ReviewSubmitResult {
  question_id: string;
  correct: boolean;
  q: number;
  passing: boolean;
  due_at: string;
  interval_days: number;
  remaining_due: number;
  correct_option_ids: string[];
  correct_answer_text: string | null;
  explanation: string | null;
}
export type StudentLessonSummaryRead = Schemas["StudentLessonSummaryRead"];
export type CohortKrResponse = Schemas["ClassKRDistributionRead"];
export type HistogramBucket = Schemas["HistogramBucket"];
export type DifficultCard = Schemas["DifficultCardRead"];
export type AtRiskStudent = Schemas["AtRiskStudentRead"];
export type StudentSrDetail = Schemas["StudentSrDetailRead"];
export type StudentSrDetailLesson = Schemas["StudentSrDetailLessonRead"];
export type StudentSrDetailReview = Schemas["StudentSrDetailReviewRead"];

export type Page<T> = { items: T[]; next_cursor: string | null };
export type Paths = paths;

// Learning Programs + career-path switch review. Extracted to keep this file
// under the 800-line cap; re-exported so `from "@/lib/api/types"` still works.
export type {
  LearningProgram,
  LearningProgramAuthoringOptions,
  LearningProgramCreate,
  LearningProgramEnrollment,
  LearningProgramOption,
  LearningProgramPath,
  LearningProgramVersion,
  PathChangeRejectionReasonCode,
  PathChangeRequest,
  PathChangeRequestStatus,
  ProgramPathAttempt,
} from "./types/learning-programs";

// Hand-written types for voice interview (endpoints not in generated openapi-types)
export type {
  RealtimeTokenResponse,
  RealtimeAgentDispatchResponse,
  IntegrityEventType,
  IntegrityEventSeverity,
  IntegrityEvent,
  IntegrityEventsRequest,
  IntegrityEventsResponse,
} from "./types/interview-voice";

export type PermissionRead = Schemas["PermissionRead"];
export type RoleRead = Schemas["RoleRead"];
export type RoleWithPermissionsRead = Schemas["RoleWithPermissionsRead"];
export type RoleAssignmentRead = Schemas["RoleAssignmentRead"];
export type RoleAssignmentCreate = Schemas["RoleAssignmentCreate"];
export type GrantRead = Schemas["GrantRead"];
export type GrantCreate = Schemas["GrantCreate"];
export type MembershipRead = Schemas["MembershipRead"];
export type MembershipCreate = Schemas["MembershipCreate"];
export type RoleChangeRow = Schemas["RoleChangeRow"];
export type HttpAuditRow = Schemas["HttpAuditRow"];

/**
 * FR-6.7 — uniform data-change projection returned by
 * `GET /admin/audit/data-changes`. The backend `DataChangeOut` model is
 * `extra="allow"`, so entity-specific columns (slug / material_type /
 * lesson_id / primary_email / scope_kind / subject_user_id) ride along as
 * optional extras. Hand-written rather than codegen'd because the OpenAPI
 * snapshot cannot express the open-ended extra keys.
 */
export type DataChangeRow = {
  entity_id: string;
  title: string;
  status: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  organization_id?: string | null;
  // entity-specific extras (present depending on `table`)
  slug?: string;
  material_type?: string;
  lesson_id?: string;
  primary_email?: string;
  scope_kind?: string;
  subject_user_id?: string;
};

/** Tables accepted by the data-changes audit lookup (mirrors backend). */
export const DATA_CHANGE_TABLES = [
  "courses",
  "materials",
  "users",
  "role_assignments",
] as const;
export type DataChangeTable = (typeof DATA_CHANGE_TABLES)[number];

/**
 * Lesson discussion feature (backend `features/discussions`). Hand-written
 * because the committed OpenAPI snapshot predates the feature; mirrors the
 * Pydantic DTOs in `abridgeai/features/discussions/schemas.py` exactly.
 */
export interface DiscussionTopic {
  id: string;
  lesson_id: string;
  title: string;
  body_markdown: string | null;
  status: "open" | "closed";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  comment_count: number;
  can_manage: boolean;
}

/** Envelope returned by `GET /lessons/{id}/discussion/topics`. */
export interface DiscussionTopicList {
  can_manage: boolean;
  topics: DiscussionTopic[];
}

export interface DiscussionCommentAuthor {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface DiscussionComment {
  id: string;
  topic_id: string;
  author_id: string;
  body: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  author: DiscussionCommentAuthor | null;
  is_own: boolean;
  can_delete: boolean;
}
