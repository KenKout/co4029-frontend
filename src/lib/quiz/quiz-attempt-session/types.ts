import type {
  useQuizAttemptProgress,
  useStartQuizAttempt,
  useStudentQuiz,
  useSubmitQuizAnswer,
  useSubmitQuizAttempt,
} from "@/lib/api/hooks/quizzes";
import type { useQuestionFocusTime } from "@/lib/quiz/use-question-focus-time";

/**
 * Shared types for the extracted pieces of {@link useQuizAttemptSession}.
 *
 * Every alias is derived from the hook it describes rather than re-declared, so
 * a signature change upstream surfaces here as a type error instead of drifting
 * silently.
 */

export type QuestionFocusTime = ReturnType<typeof useQuestionFocusTime>;
export type AttemptProgressQuery = ReturnType<typeof useQuizAttemptProgress>;
export type StudentQuiz = ReturnType<typeof useStudentQuiz>["data"];
export type StartAttemptMutation = ReturnType<typeof useStartQuizAttempt>;
export type SubmitAnswerMutation = ReturnType<typeof useSubmitQuizAnswer>;
export type SubmitAttemptMutation = ReturnType<typeof useSubmitQuizAttempt>;

/**
 * The three refs the session keeps outside React state, shared by hydration
 * and the start/submit actions. Declared structurally so they satisfy whatever
 * `useRef` returns in the installed React types.
 */
export interface AttemptSessionRefs {
  autoSubmitStartedRef: { current: boolean };
  questionSeenAtRef: { current: Record<string, number> };
  hydratedAttemptIdRef: { current: string | null };
}
