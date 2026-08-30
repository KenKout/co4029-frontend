import type { useTranslation } from "react-i18next";

import type {
  useDeleteInterviewQuestionBankItem,
  useUpdateInterviewQuestionBankItem,
} from "@/lib/api/hooks/interviews";
import type { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import type {
  InterviewDifficulty,
  InterviewQuestionType,
} from "@/lib/api/types";

/**
 * Shared types for the course-level Question Bank management page, extracted
 * from the former 843-line course-question-bank.tsx so the orchestrator, the
 * hooks and the presentational components agree on one definition instead of
 * passing loosely-typed props. No behavioural surface of its own.
 */

/** `t` exactly as the orchestrator's `useTranslation()` hands it out. */
export type TranslateFn = ReturnType<typeof useTranslation>["t"];

export type UpdateBankItemMutation = ReturnType<
  typeof useUpdateInterviewQuestionBankItem
>;
export type DeleteBankItemMutation = ReturnType<
  typeof useDeleteInterviewQuestionBankItem
>;

/** The course record exactly as the page's `useTeacherCourseById` returns it. */
export type CourseDetailData = ReturnType<typeof useTeacherCourseById>["data"];

export interface EditorState {
  prompt_text: string;
  question_type: InterviewQuestionType;
  difficulty: InterviewDifficulty | "none";
  model_answer: string;
  tags: string[];
  isLogicalGroupMember: boolean;
}

/** The four filter dimensions the bank filters on, as one snapshot. */
export interface QuestionBankFilterValues {
  search: string;
  typeFilter: InterviewQuestionType | "all";
  difficultyFilter: InterviewDifficulty | "all";
  tagFilter: string;
}
