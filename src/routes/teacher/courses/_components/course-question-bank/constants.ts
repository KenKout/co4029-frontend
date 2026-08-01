import type {
  InterviewDifficulty,
  InterviewQuestionType,
} from "@/lib/api/types";

/**
 * Constant tables for the course-level Question Bank management page, extracted
 * from the former 843-line course-question-bank.tsx.
 */
export const QUESTION_TYPES: InterviewQuestionType[] = [
  "conceptual",
  "behavioral",
  "technical",
  "situational",
  "system_design",
];
export const DIFFICULTIES: InterviewDifficulty[] = [
  "junior",
  "mid_level",
  "senior",
];

/** Stagger step for the row entrance, capped so a long bank isn't slow. */
export const STAGGER_MS = 45;
export const STAGGER_CAP = 8;
