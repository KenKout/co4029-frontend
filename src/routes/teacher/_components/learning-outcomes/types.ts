import type { useTranslation } from "react-i18next";

import type {
  InterviewOutcomeAuthoring,
  InterviewQuestionAuthoring,
} from "@/lib/api/types";

/**
 * Shared types for the interview learning-outcomes section, extracted from the
 * former 750-line `learning-outcomes.tsx` so the controller hook and the
 * presentational rows agree on one definition.
 */

/** `t` exactly as the section's `useTranslation()` hands it out. */
export type TranslateFn = ReturnType<typeof useTranslation>["t"];

/** Coverage grade for one outcome, derived from its question count. */
export type Coverage = "none" | "limited" | "covered";

export interface LearningOutcomesProps {
  configId: string;
  /** Parent course id — lets the teacher import course-level outcomes. */
  courseId: string;
  outcomes: InterviewOutcomeAuthoring[];
  questions: InterviewQuestionAuthoring[];
  /** Config-level pass threshold (min outcomes a student must satisfy). */
  minOutcomesToPass: number | null | undefined;
  /** Scroll to the Question Bank and filter it to this outcome's questions. */
  onViewQuestions: (outcomeId: string) => void;
  /**
   * Config status. On "published" the whole section is read-only: the AI judges
   * answers against these outcomes, so adding/removing/reweighting one mid-cohort
   * would change how already-submitted answers score. The backend refuses the
   * mutations (409 interview_published_setting_locked); this dims the controls
   * so the teacher never types into an edit that cannot save.
   */
  status: string | null | undefined;
}
