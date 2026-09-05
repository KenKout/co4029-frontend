/**
 * Manager / faculty-dean dashboard payload.
 *
 * Mirrors ``abridgeai/features/courses/schemas/management_dashboard.py``. Hand
 * written rather than generated: the OpenAPI snapshot in this repo is stale and
 * regenerating it sweeps in unrelated backend drift (see the frontend
 * conventions skill).
 */

/** Why a course cannot be published. Machine-readable companion to `reason`. */
export type BlockedCourseReasonCode =
  | "no_gradeable_content"
  | "no_learning_outcomes"
  | "understaffed"
  | "archived";

export interface BlockedCourseRow {
  course_id: string;
  organization_id: string;
  faculty_id: string | null;
  title: string;
  slug: string;
  status: string;
  /** Human-readable sentence joining every failing gate. Never empty. */
  reason: string;
  reason_codes: BlockedCourseReasonCode[];
  gradeable_unit_count: number;
  learning_outcome_count: number;
  teacher_count: number;
  min_teachers: number;
  /**
   * True when this course sits in a REQUIRED stage of a learning program, so
   * the block holds up every student on that path. Drives worst-first order.
   */
  blocks_required_stage: boolean;
}

export interface ProgramAttentionRow {
  program_id: string;
  organization_id: string;
  name: string;
  /** Open = pending + in_progress. The drill-down returns every status. */
  open_path_change_requests: number;
  has_draft_version: boolean;
  stage_count: number;
  reason: string;
}

export interface ManagementDashboardCounts {
  courses_total: number;
  courses_draft: number;
  courses_published: number;
  courses_blocked: number;
  programs_total: number;
  /**
   * `null` — not 0 — when the caller cannot review path changes. Zero would
   * claim "no work waiting"; null says "not your queue".
   */
  open_path_change_requests: number | null;
}

export interface ManagementDashboardRead {
  scope_kind: "course" | "org_unit" | "organization" | "global";
  organization_id: string | null;
  faculty_ids: string[];
  can_review_path_changes: boolean;
  counts: ManagementDashboardCounts;
  blocked_courses: BlockedCourseRow[];
  programs_needing_attention: ProgramAttentionRow[];
}
