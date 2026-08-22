import type { QuizAttemptRead, QuizPublic } from "@/lib/api/types";

/**
 * Derived state for the pre-attempt panel, lifted verbatim out of
 * QuizIntroPanel. Pure — the expressions are the ones the component computed
 * inline, so the rendered branches are unchanged.
 */
export function deriveIntroState(
  quiz: QuizPublic,
  attempts: QuizAttemptRead[],
) {
  const completed = attempts.filter(
    (a) => a.status === "submitted" || a.status === "graded",
  ).length;
  const passingScore = Math.round(Number(quiz.passing_score_percent));

  // Best score across graded/submitted attempts + whether the student has
  // already cleared the passing bar — powers the "you've passed" banner and
  // the best-score chip. null when no scored attempt exists yet.
  const scoredAttempts = attempts.filter(
    (a) => a.status === "submitted" || a.status === "graded",
  );
  const bestScore = scoredAttempts.reduce<number | null>((best, a) => {
    if (a.score_percent == null) return best;
    const s = Number(a.score_percent);
    return best == null || s > best ? s : best;
  }, null);
  const hasPassed = scoredAttempts.some((a) => a.passed === true);
  const questionCount = quiz.question_count ?? 0;
  const maxAttemptsReached =
    quiz.max_attempts != null && completed >= quiz.max_attempts;
  const noRetakesLeft = completed > 0 && !quiz.allow_retakes;

  // Scheduling window (backend migration 0032). NULL columns = no bound.
  // available_from → not open yet; available_until → closed. `due_at` is a
  // soft deadline: never blocks, only surfaces a "due" label / late warning.
  const now = Date.now();
  const openAt = quiz.available_from ? new Date(quiz.available_from) : null;
  const closeAt = quiz.available_until ? new Date(quiz.available_until) : null;
  const dueAt = quiz.due_at ? new Date(quiz.due_at) : null;
  const notYetOpen = openAt != null && now < openAt.getTime();
  const windowClosed = closeAt != null && now > closeAt.getTime();
  const pastDue = dueAt != null && now > dueAt.getTime();
  const blocked =
    maxAttemptsReached || noRetakesLeft || notYetOpen || windowClosed;

  // Most recent attempts first; in_progress filtered out (review only after submit)
  const reviewableAttempts = [...attempts]
    .filter((a) => a.status === "submitted" || a.status === "graded")
    .sort((a, b) => b.attempt_number - a.attempt_number);

  return {
    completed,
    passingScore,
    bestScore,
    hasPassed,
    questionCount,
    maxAttemptsReached,
    noRetakesLeft,
    openAt,
    closeAt,
    dueAt,
    notYetOpen,
    windowClosed,
    pastDue,
    blocked,
    reviewableAttempts,
  };
}

export type IntroState = ReturnType<typeof deriveIntroState>;
