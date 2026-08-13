import type { ReviewOptions } from "@/lib/api/hooks/quizzes";

/**
 * Shared types for the quiz-manage screen, extracted from the former
 * 3.5k-line quiz-manage.tsx so the tab components and the page shell can
 * agree on one definition instead of passing loosely-typed props.
 */

export type TabKey = "questions" | "settings" | "preview";

export interface SettingsDraft {
  title: string;
  description: string;
  time_limit_minutes: string;
  passing_score_percent: number;
  max_attempts: string;
  cooldown_hours: string;
  initial_ef: string;
  min_ef_for_unlock: string;
  coverage_threshold: string;
  allow_retakes: boolean;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_hints: boolean;
  reminders_enabled: boolean;
  // Moodle-style headline-score policy (migration 0033).
  grading_method: "highest" | "average" | "first" | "last";
  // Scheduling window (migration 0032). Held as `datetime-local` strings
  // ("YYYY-MM-DDTHH:mm", local time) or "" when unset.
  available_from: string;
  available_until: string;
  due_at: string;
  // Review-visibility matrix (Phase 2). Always a full 3×5 matrix in the draft.
  review_options: ReviewOptions;
  // Access rules (Phase 12). Empty string = no restriction.
  require_password: string;
  require_subnet: string;
  browser_security: boolean;
  // Timing enforcement (Phase 6).
  overdue_handling: "autosubmit" | "graceperiod" | "autoabandon";
  grace_period_seconds: string;
}

/**
 * Key-wise patch callback the SettingsTab hands to each of its section
 * components, so a section can write one field without owning the draft.
 */
export type SettingsUpdate = <K extends keyof SettingsDraft>(
  key: K,
  value: SettingsDraft[K],
) => void;

export interface QuestionDraft {
  prompt_text: string;
  hint_text: string;
  explanation: string;
  difficulty: string;
  expected_response_seconds: number | null;
  review_status: string;
  learning_outcome_id: string | null;
  options: Array<{
    id: string;
    option_key: string;
    option_text: string;
    is_correct: boolean;
  }>;
  // Phase 7: type-specific answer fields (editable for the expanded types).
  single_answer: boolean;
  numeric_answer: string;
  numeric_tolerance: string;
  match_pairs: Array<{ left: string; right: string }>;
  // Matching distractors: extra unpaired right-side choices. Empty = classic
  // 1:1 matching.
  match_distractors: string[];
  /** Correct answer for short_answer (string) / fill_blank (per-blank list). */
  correct_answer: string | string[] | null;
  ordering_sequence: string[];
}

export interface QuestionNavStatus {
  error: boolean;
  approved: boolean;
  unsaved: boolean;
  selected: boolean;
  focused: boolean;
}
