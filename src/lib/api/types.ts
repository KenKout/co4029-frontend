/**
 * Hand-curated re-exports of generated OpenAPI schemas.
 * Generated source: ./openapi-types.d.ts — regenerate via `npm run codegen:api`.
 */
import type { components, paths } from "./openapi-types";

type Schemas = components["schemas"];

export type Course = Schemas["CoursePublic"];
export type CoursePublic = Schemas["CoursePublic"];
export type CourseAuthoring = Schemas["CourseAuthoring"];
export type CourseCreate = Schemas["CourseCreate"];
export type CourseUpdate = Schemas["CourseUpdate"];
export type CourseContent = Schemas["CourseContentPublic"];
export type CourseContentPublic = Schemas["CourseContentPublic"];
export type CourseProgressSummary = Schemas["CourseProgressSummary"];
export type CourseLearningOutcome = Schemas["CourseLearningOutcomePublic"];
export type CourseLearningOutcomePublic = Schemas["CourseLearningOutcomePublic"];
export type CourseLearningOutcomeAuthoring =
  Schemas["CourseLearningOutcomeAuthoring"];

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

export type InstructorRead = Schemas["InstructorRead"];

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

export type ResourceDownloadUrlResponse = Schemas["ResourceDownloadUrlResponse"];

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
}

export type Quiz = Schemas["QuizPublic"] & QuizScheduleWindow;
export type QuizPublic = Schemas["QuizPublic"] & QuizScheduleWindow;
export type QuizAuthoring = Schemas["QuizAuthoring"] & QuizScheduleWindow;
export type QuizForTaking = Schemas["QuizForTakingPublic"];
export type QuizForTakingPublic = Schemas["QuizForTakingPublic"];
export type QuizForAuthoring = Schemas["QuizForAuthoringPublic"];
export type QuizForAuthoringPublic = Schemas["QuizForAuthoringPublic"];
export type QuizAttempt = Schemas["QuizAttemptRead"];
export type QuizAttemptRead = Schemas["QuizAttemptRead"];
export type QuizAttemptReviewRead = Schemas["QuizAttemptReviewRead"];
export type QuizAttemptReviewQuestion = Schemas["QuizAttemptReviewQuestion"];
export type QuizAttemptReviewOption = Schemas["QuizAttemptReviewOption"];
export type QuizAttemptStart = Schemas["QuizAttemptStart"];
export type QuizAttemptSubmitAnswer = Schemas["QuizAttemptAnswerInput"];
export type QuizAttemptAnswerRead = Schemas["QuizAttemptAnswerRead"];
export type QuizQuestion = Schemas["QuizQuestionPublic"];
export type QuizQuestionPublic = Schemas["QuizQuestionPublic"];
export type QuizQuestionAuthoring = Schemas["QuizQuestionAuthoring"];
export type QuizQuestionOptionPublic = Schemas["QuizQuestionOptionPublic"];
export type QuizQuestionOptionAuthoring = Schemas["QuizQuestionOptionAuthoring"];
export type QuestionBankEntry = Schemas["QuestionBankEntry"];
export type QuestionBankImportRequest = Schemas["QuestionBankImportRequest"];

export type GenerationRunRead = Schemas["QuizGenerationRunRead"];
export type QuizGenerationRunRead = Schemas["QuizGenerationRunRead"];
export type QuizGenerationRequest = Schemas["QuizGenerationRequest"];
export type QuizGenerationProgress = Schemas["QuizGenerationProgress"];
export type QuizGenerationStageEvent = Schemas["QuizGenerationStageEvent"];
export type BulkSetExpectedTimeRequest = Schemas["BulkSetExpectedTimeRequest"];
export type BulkSetExpectedTimeResponse = Schemas["BulkSetExpectedTimeResponse"];
export type BulkSetItem = Schemas["BulkSetItem"];

export type InterviewConfigPublic = Schemas["InterviewConfigPublic"];
export type InterviewConfigAuthoring = Schemas["InterviewConfigAuthoring"];
export type InterviewConfigCreate = Schemas["InterviewConfigCreate"];
export type InterviewConfigUpdate = Schemas["InterviewConfigUpdate"];
export type InterviewForTakingPublic = Schemas["InterviewForTakingPublic"];
export type InterviewSessionPublic = Schemas["InterviewSessionPublic"];
export type InterviewSessionStartRequest = Schemas["InterviewSessionStartRequest"];
export type InterviewLanguage = NonNullable<
  Schemas["InterviewOnboardingRespondRequest"]["language"]
>;
export type InterviewOnboardingStage =
  Schemas["InterviewOnboardingRespondResponse"]["onboarding_stage"];
export type InterviewSessionHistoryTurn = Schemas["InterviewSessionHistoryTurn"];
export type InterviewSessionStartResponse = Schemas["InterviewSessionStartResponse"] & {
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
export type InterviewSessionFinishResponse = Schemas["InterviewSessionFinishResponse"];
export interface InterviewSessionFinishRequest {
  reason?: "natural" | "ended_early" | "timed_out";
}
export type InterviewRespondRequest = Schemas["InterviewSubmitAnswerRequest"];
export type InterviewSubmitAnswerRequest = Schemas["InterviewSubmitAnswerRequest"];
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
export type InterviewQuestionAuthoring = Schemas["InterviewQuestionAuthoring"];
export type InterviewQuestionCreate = Schemas["InterviewQuestionCreate"];
export type InterviewOutcomeAuthoring = Schemas["InterviewOutcomeAuthoring"];
export type InterviewOutcomeCreate = Schemas["InterviewOutcomeCreate"];
export type InterviewGenerationRequest = Schemas["InterviewGenerationRequest"];
export type InterviewGenerationRunPublic = Schemas["InterviewGenerationRunPublic"];
export type GapReportRead = Schemas["GapReportRead"];
export type GapReportAuthoringRead = Schemas["GapReportAuthoringRead"];

// Adaptive readiness (Slice 5) — advisory authoring analysis. Manually typed
// until the OpenAPI snapshot is regenerated; the backend returns these from
// GET /teacher/interview-configs/{id}/adaptive-readiness.
export type AdaptiveReadinessLevel = "info" | "warning";
export interface AdaptiveReadinessWarning {
  code: string;
  level: AdaptiveReadinessLevel;
  affected_ids: string[];
  count: number;
}
export interface AdaptiveModeRolloutStatus {
  text: boolean;
  hybrid: boolean;
  voice: boolean;
}
export interface AdaptiveReadinessRead {
  config_id: string;
  warnings: AdaptiveReadinessWarning[];
  rollout: AdaptiveModeRolloutStatus;
  blocks_publish: boolean;
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

export type InterviewSessionTeacherRead = Schemas["InterviewSessionTeacherRead"];
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

export type TeacherAssignmentRead = Schemas["TeacherAssignmentRead"];
export type TeacherAssignmentCreated = Schemas["TeacherAssignmentCreated"];
export type AssignTeacherRequest = Schemas["AssignTeacherRequest"];
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
export type NotificationPreferenceUpdate = Schemas["NotificationPreferenceUpdate"];

/**
 * Notification category literals.
 *
 * The OpenAPI schema surfaces `category` as a free-form string, but the
 * backend ships exactly five categories. We pin them as a literal union for
 * exhaustive matrix rendering and Vietnamese-label maps.
 */
export type NotificationCategory =
  | "spaced_repetition"
  | "lesson_unlock"
  | "interview_result"
  | "course_announcement"
  | "system";

export type NotificationChannel = "email" | "in_app";

export type User = Schemas["UserRead"];
export type UserProfile = Schemas["UserProfileRead"];
export type UserProfileUpdate = Schemas["UserProfileUpdate"];
export type UserListRow = Schemas["UserListRow"];
export type UserListPage = Schemas["abridgeai__features__identity__schemas__profile__UserListPage"];
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
export type ContentOut = Schemas["ContentOut"];
export type HealthOut = Schemas["HealthOut"];

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
export type AiModelPricing = Schemas["ModelPricingOut"];
export type AiCostsPipelineStage = Schemas["PipelineStage"];
export type AiCostsRecentCall = Schemas["RecentCallOut"];
export type AiCallRecord = Schemas["RecentCallOut"];

export type CareerPathPublic = Schemas["CareerPathPublic"];
export type CareerPathCoursePublic = Schemas["CareerPathCoursePublic"];
export type CareerPathAuthoring = Schemas["CareerPathAuthoring"];
export type CareerPathCourseAuthoring = Schemas["CareerPathCourseAuthoring"];
export type CareerPathCreate = Schemas["CareerPathCreate"];
export type CareerPathUpdate = Schemas["CareerPathUpdate"];
export type CareerPathCourseAdd = Schemas["CareerPathCourseAdd"];
export type CareerPathCourseReorder = Schemas["CareerPathCourseReorder"];
export type CareerPathStudentEnroll = Schemas["CareerPathStudentEnroll"];
export type CareerPathProgressRead = Schemas["CareerPathProgressRead"];
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
export type CardDue = CardDueItem;
export type CardsDuePage = Schemas["CardsDuePage"];
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

// Hand-written types for voice interview (endpoints not in generated openapi-types)
export type {
  RealtimeTokenResponse,
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
