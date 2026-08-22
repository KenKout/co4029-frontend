import type { QuizPublic } from "@/lib/api/types";
import type { useQuizAttemptSession } from "@/lib/quiz/use-quiz-attempt-session";

/**
 * Shared types for the extracted pieces of course-quiz.tsx.
 *
 * The take session controller is passed around whole rather than as twenty
 * scalars — the page previously destructured it inline, so every sub-view reads
 * the same field names it always did.
 */
export type QuizSession = ReturnType<typeof useQuizAttemptSession>;

/** Every stage needs the quiz (non-null past the page's guards) + the slug. */
export interface QuizStageProps {
  session: QuizSession;
  quiz: QuizPublic;
  slug: string;
}
