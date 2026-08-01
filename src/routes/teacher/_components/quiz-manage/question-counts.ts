import type { QuizQuestionAuthoring } from "@/lib/api/types";
import { hasInvalidExpectedTime } from "./helpers";

/**
 * Counts the questions tab's banners read. Extracted from QuestionsTab so the
 * tab stays composition; pure, so the bookkeeping can be reasoned about without
 * mounting the tab.
 */
export interface QuestionsTabCounts {
  pendingCount: number;
  /** Questions whose saved row has no expected time but whose editor does. */
  unsavedDefaultTimeIds: string[];
  unsavedDefaultTimeCount: number;
  blankExpectedTimeCount: number;
}

export function summariseQuestionCounts(
  questions: QuizQuestionAuthoring[],
  dirtyIds: Set<string>,
): QuestionsTabCounts {
  const pendingCount = questions.filter(
    (q) => q.review_status !== "approved",
  ).length;

  // Split the "no expected time on the row" population into the two cases that
  // need different messaging (see QuestionsTabBanners). A question is only
  // genuinely blank if the editor also has no value for it — otherwise the
  // editor is showing a pre-filled default that merely needs saving.
  const noSavedTimeQuestions = questions.filter(hasInvalidExpectedTime);
  const unsavedDefaultTimeIds = noSavedTimeQuestions
    .filter((q) => dirtyIds.has(q.id))
    .map((q) => q.id);
  const unsavedDefaultTimeCount = unsavedDefaultTimeIds.length;

  return {
    pendingCount,
    unsavedDefaultTimeIds,
    unsavedDefaultTimeCount,
    blankExpectedTimeCount:
      noSavedTimeQuestions.length - unsavedDefaultTimeCount,
  };
}
