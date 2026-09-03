import type { QuizAttemptRead, QuizPublic } from "@/lib/api/types";

function latestSubmittedAt(attempts: QuizAttemptRead[]) {
  return attempts.reduce<number | null>((latest, attempt) => {
    if (!attempt.submitted_at) return latest;
    const value = new Date(attempt.submitted_at).getTime();
    if (!Number.isFinite(value)) return latest;
    return latest == null || value > latest ? value : latest;
  }, null);
}

function retryTime(quiz: QuizPublic, attempts: QuizAttemptRead[]): Date | null {
  const latest = latestSubmittedAt(attempts);
  if (latest == null || !quiz.cooldown_hours) return null;
  return new Date(latest + quiz.cooldown_hours * 60 * 60 * 1000);
}

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
  const attemptsUsed = attempts.length;
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
    quiz.max_attempts != null && attemptsUsed >= quiz.max_attempts;
  const noRetakesLeft = attemptsUsed > 0 && !quiz.allow_retakes;

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
  const retryAvailableAt = retryTime(quiz, attempts);
  const cooldownActive =
    retryAvailableAt != null && now < retryAvailableAt.getTime();
  const blocked =
    maxAttemptsReached ||
    noRetakesLeft ||
    notYetOpen ||
    windowClosed ||
    cooldownActive;

  // Most recent attempts first; in_progress filtered out (review only after submit)
  const reviewableAttempts = [...attempts]
    .filter((a) => a.status === "submitted" || a.status === "graded")
    .sort((a, b) => b.attempt_number - a.attempt_number);

  return {
    completed,
    attemptsUsed,
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
    retryAvailableAt,
    cooldownActive,
    blocked,
    reviewableAttempts,
  };
}

export type IntroState = ReturnType<typeof deriveIntroState>;
