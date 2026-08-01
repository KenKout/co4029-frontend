import type { QuizPublic } from "@/lib/api/types";
import {
  EMPTY_STATUS,
  hasAnswer,
  questionState,
} from "@/lib/quiz/quiz-session-helpers";
import type { QuizSummaryItem } from "@/routes/_components/QuizSummaryCard";
import type { QuizSession } from "./types";

/**
 * The take screen's derived values, lifted verbatim out of course-quiz.tsx.
 * Pure — every expression is the one the page computed inline.
 */
export function deriveTakingView(session: QuizSession, quiz: QuizPublic) {
  const { displayQuestions, statuses, activeIdx, perQuestionCooldown } =
    session;
  const activeQuestion = displayQuestions[activeIdx];
  const activeStatus = statuses[activeIdx] ?? EMPTY_STATUS;
  const completedCount = statuses.filter(hasAnswer).length;
  const flaggedCount = statuses.filter((s) => s.flagged).length;
  const progressPct = displayQuestions.length
    ? Math.round((completedCount / displayQuestions.length) * 100)
    : 0;
  const isLastQuestion = activeIdx === displayQuestions.length - 1;
  const passingScore = Math.round(Number(quiz.passing_score_percent));
  const activeQuestionCooldown = activeQuestion
    ? (perQuestionCooldown[activeQuestion.id] ?? null)
    : null;

  return {
    activeQuestion,
    activeStatus,
    completedCount,
    flaggedCount,
    progressPct,
    isLastQuestion,
    passingScore,
    activeQuestionCooldown,
  };
}

export type TakingView = ReturnType<typeof deriveTakingView>;

/** The summary-rail items for every question in the take. */
export function buildSummaryItems(session: QuizSession): QuizSummaryItem[] {
  const { displayQuestions, statuses, activeIdx, perQuestionCooldown } =
    session;
  return displayQuestions.map((question, index) => {
    const status = statuses[index] ?? EMPTY_STATUS;
    return {
      id: question.id,
      index,
      state: questionState(index, activeIdx, status),
      onCooldown: !!perQuestionCooldown[question.id],
      promptText: question.prompt_text,
    };
  });
}
