import { useState } from "react";
import type { QuizAttemptRead, QuizForTakingPublic } from "@/lib/api/types";
import { loadPageSize, type QuizPageSize } from "@/lib/quiz-timing";
import type { QuestionStatus } from "@/lib/quiz/quiz-session-helpers";

/**
 * The take session's local React state, in the exact declaration order it had
 * inside `useQuizAttemptSession` — hook order is part of the contract, so this
 * block must stay contiguous and unreordered.
 */
export function useAttemptSessionState() {
  const [taking, setTaking] = useState<QuizForTakingPublic | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [statuses, setStatuses] = useState<QuestionStatus[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submittedSummary, setSubmittedSummary] =
    useState<QuizAttemptRead | null>(null);
  const [perQuestionCooldown, setPerQuestionCooldown] = useState<
    Record<string, string>
  >({});
  const [hintDialogOpen, setHintDialogOpen] = useState(false);
  // Wall-clock start of the whole attempt (epoch ms). Drives the "Started at"
  // label and the total-elapsed indicator, which stays visible whether or not
  // the quiz has a time limit. Set on fresh start and on resume/hydrate so the
  // elapsed count reflects the ORIGINAL start, not this session.
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [quizElapsed, setQuizElapsed] = useState(0);

  // --- Pagination -----------------------------------------------------------
  // How many questions render at once: 1 (classic one-per-screen), 5, 10, or
  // every question on a single page. Persisted per device.
  const [pageSize, setPageSize] = useState<QuizPageSize>(() => loadPageSize());
  const [pageIndex, setPageIndex] = useState(0);

  return {
    taking,
    setTaking,
    activeAttemptId,
    setActiveAttemptId,
    activeIdx,
    setActiveIdx,
    statuses,
    setStatuses,
    timeLeft,
    setTimeLeft,
    submittedSummary,
    setSubmittedSummary,
    perQuestionCooldown,
    setPerQuestionCooldown,
    hintDialogOpen,
    setHintDialogOpen,
    quizStartedAt,
    setQuizStartedAt,
    quizElapsed,
    setQuizElapsed,
    pageSize,
    setPageSize,
    pageIndex,
    setPageIndex,
  };
}

export type AttemptSessionState = ReturnType<typeof useAttemptSessionState>;
