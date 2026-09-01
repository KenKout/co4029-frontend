/**
 * Learning Program + Career-Path-switch DTOs.
 *
 * Hand-written (like the interview-voice and curated-KG types) because the
 * committed `openapi-snapshot.json` lags the live spec; regenerating to pick
 * these up drags in unrelated endpoint drift.
 *
 * Extracted from `types.ts` when that file passed the 800-line cap. Re-exported
 * from `types.ts`, so every existing `from "@/lib/api/types"` import is
 * unaffected.
 */

export interface LearningProgramPath {
  career_path_id: string;
  career_path_version_id: string;
  career_path_version_no: number;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  position: number;
}

export interface LearningProgramVersion {
  id: string;
  version_no: number;
  status: "draft" | "published";
  max_path_switches: number;
  published_at: string | null;
  published_by: string | null;
  published_by_name: string | null;
}

export interface LearningProgram {
  id: string;
  organization_id: string;
  faculty_id: string;
  owner_faculty_dean_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  current_version: LearningProgramVersion;
  paths: LearningProgramPath[];
  created_at: string;
  updated_at: string;
  // Management-list card statistics (user decision 2026-08-31): filled by the
  // list endpoint only; detail responses leave the defaults.
  student_count?: number;
  /** Counts OPEN requests (`pending` + `in_progress`) — the dean's review inbox. */
  path_change_request_count?: number;
  has_draft_version?: boolean;
}

export interface ProgramPathAttempt {
  id: string;
  career_path_id: string;
  career_path_version_id: string;
  previous_attempt_id: string | null;
  status: "active" | "completed" | "switched_out" | "cancelled";
  selected_at: string;
  ended_at: string | null;
  exit_snapshot: Record<string, unknown> | null;
}

export interface LearningProgramEnrollment {
  id: string;
  learning_program_id: string;
  program_version_id: string;
  student_id: string;
  status: "awaiting_path" | "active" | "completed" | "withdrawn" | "cancelled";
  enrolled_at: string;
  completed_at: string | null;
  withdrawn_at: string | null;
  program_name: string;
  program_version_no: number;
  max_path_switches: number;
  approved_switch_count: number;
  current_progress_percent: number;
  current_completed_courses: number;
  current_total_courses: number;
  paths: LearningProgramPath[];
  attempts: ProgramPathAttempt[];
  /** The student's OPEN request — `pending` OR `in_progress`. The name predates
   *  the `in_progress` status; read `status` to tell the two apart. */
  pending_change_request: PathChangeRequest | null;
  /** Every request this enrolment filed, newest first — including rejections
   *  with their reason. Drives the student's request history. */
  change_request_history: PathChangeRequest[];
}

export interface LearningProgramCreate {
  faculty_id: string;
  slug: string;
  name: string;
  description?: string | null;
  max_path_switches?: number;
  career_path_ids: string[];
}

export interface LearningProgramOption {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  /** False for draft/archived paths — shown disabled in the picker. */
  selectable?: boolean;
  not_selectable_reason?: string | null;
}

export interface LearningProgramAuthoringOptions {
  faculties: LearningProgramOption[];
  career_paths: LearningProgramOption[];
  default_faculty_id: string | null;
}

/** Why a Faculty Dean rejected a path-change request. Mirrors the backend
 *  `PathChangeRejectionReasonCode` literal and the DB CHECK constraint. */
export type PathChangeRejectionReasonCode =
  | "insufficient_justification"
  | "progress_loss_too_high"
  | "target_path_not_suitable"
  | "preserve_remaining_switch"
  | "advising_required"
  | "documentation_missing"
  | "other";

/** Statuses in which a request is still OPEN (occupies the one-per-enrolment
 *  slot and is decidable). `in_progress` means the dean has acknowledged it. */
export type PathChangeRequestStatus =
  | "pending"
  | "in_progress"
  | "approved"
  | "rejected"
  | "cancelled"
  | "invalidated";

export interface PathChangeRequest {
  id: string;
  program_enrollment_id: string;
  from_attempt_id: string;
  target_career_path_id: string;
  target_career_path_version_id: string;
  reason: string;
  status: PathChangeRequestStatus;
  /** When a dean acknowledged the request (no decision implied). */
  in_progress_at: string | null;
  in_progress_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  /** Set only on rejection. */
  decision_reason_code: PathChangeRejectionReasonCode | null;
  decision_reason: string | null;
  new_attempt_id: string | null;
  created_at: string;
}
