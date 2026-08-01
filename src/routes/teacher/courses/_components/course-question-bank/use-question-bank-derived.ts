import { useMemo } from "react";

import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import {
  collectBankTags,
  countBankItemsByType,
  countBankItemsWithAnswer,
  filterBankItems,
} from "./helpers";
import type { QuestionBankFiltersController } from "./use-question-bank-filters";

/**
 * Everything the page derives from the fetched bank, extracted from the former
 * 843-line course-question-bank.tsx. The four `useMemo` calls keep their
 * original order and their original dependency arrays.
 */
export interface QuestionBankDerived {
  allTags: string[];
  filtered: InterviewQuestionBankItemRead[];
  typeCounts: Map<string, number>;
  withAnswer: number;
  total: number;
  hasItems: boolean;
}

export function useQuestionBankDerived(options: {
  items: InterviewQuestionBankItemRead[] | undefined;
  filters: QuestionBankFiltersController;
}): QuestionBankDerived {
  const { items, filters } = options;
  const { search, typeFilter, difficultyFilter, tagFilter } = filters;

  const allTags = useMemo(() => collectBankTags(items), [items]);

  const filtered = useMemo(
    () =>
      filterBankItems(items, {
        search,
        typeFilter,
        difficultyFilter,
        tagFilter,
      }),
    [items, search, typeFilter, difficultyFilter, tagFilter],
  );

  // Per-type counts drive the segmented filter badges: the teacher can see the
  // shape of the bank without applying a filter to find out.
  const typeCounts = useMemo(() => countBankItemsByType(items), [items]);

  const withAnswer = useMemo(() => countBankItemsWithAnswer(items), [items]);

  const total = items?.length ?? 0;
  const hasItems = total > 0;

  return { allTags, filtered, typeCounts, withAnswer, total, hasItems };
}
