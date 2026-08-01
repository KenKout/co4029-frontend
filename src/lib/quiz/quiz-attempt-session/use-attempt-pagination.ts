import { useCallback, useEffect } from "react";
import type { QuizQuestionPublic } from "@/lib/api/types";
import { savePageSize, type QuizPageSize } from "@/lib/quiz-timing";
import type { AttemptSessionState } from "./use-attempt-session-state";

/**
 * Page slicing for the take screen plus the two page-navigation callbacks.
 *
 * The slicing maths is mirrored verbatim by `src/lib/__tests__/quiz-pagination.test.ts`
 * — keep the expressions identical to that `slice()` helper.
 */
export function useAttemptPagination(args: {
  state: AttemptSessionState;
  displayQuestions: QuizQuestionPublic[];
  sessionReady: boolean;
}) {
  const { state, displayQuestions, sessionReady } = args;
  const {
    activeIdx,
    pageIndex,
    pageSize,
    setActiveIdx,
    setPageIndex,
    setPageSize,
  } = state;

  // --- Page slicing ---------------------------------------------------------
  const perPage =
    pageSize === "all" ? Math.max(1, displayQuestions.length) : pageSize;
  const pageCount = Math.max(1, Math.ceil(displayQuestions.length / perPage));
  // Clamp so shrinking the quiz (or switching 1 -> All) can't strand us on a
  // page that no longer exists.
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageStart = safePageIndex * perPage;
  const pageEnd = Math.min(pageStart + perPage, displayQuestions.length);
  const pageQuestions = displayQuestions.slice(pageStart, pageEnd);

  // Keep the page in step with the active question. Jumping via the summary
  // card sets activeIdx; if that question lives on another page we follow it.
  useEffect(() => {
    if (!sessionReady) return;
    const target = Math.floor(activeIdx / perPage);
    setPageIndex((current) => (current === target ? current : target));
  }, [activeIdx, perPage, sessionReady]);

  const changePageSize = useCallback(
    (next: QuizPageSize) => {
      setPageSize(next);
      savePageSize(next);
      // Keep the student anchored on the question they were looking at rather
      // than snapping to page 1.
      const nextPer =
        next === "all" ? Math.max(1, displayQuestions.length) : next;
      setPageIndex(Math.floor(activeIdx / nextPer));
    },
    [activeIdx, displayQuestions.length],
  );

  const goToPage = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, pageCount - 1));
      setPageIndex(clamped);
      // Move the active question to the first on the new page so per-question
      // actions and the "current" highlight stay meaningful.
      setActiveIdx(clamped * perPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [pageCount, perPage],
  );

  return {
    perPage,
    pageCount,
    safePageIndex,
    pageStart,
    pageEnd,
    pageQuestions,
    changePageSize,
    goToPage,
  };
}
