import { EmptyBankState, EmptyFilteredState } from "./EmptyStates";
import { QuestionBankSkeleton } from "./QuestionBankSkeleton";
import { QuestionList, type QuestionRowControllers } from "./QuestionList";
import type { QuestionBankDerived } from "./use-question-bank-derived";

/**
 * The page's body region: the loading skeleton, the two empty states, and the
 * question list.
 *
 * Extracted from the former 843-line course-question-bank.tsx — same four
 * branches in the same order the nested ternary evaluated them, so the
 * loading-vs-empty-vs-filtered-empty-vs-list decision is unchanged.
 */
export function QuestionBankBody({
  isLoading,
  derived,
  controllers,
}: {
  isLoading: boolean;
  derived: QuestionBankDerived;
  controllers: QuestionRowControllers;
}) {
  if (isLoading) return <QuestionBankSkeleton />;
  if (!derived.hasItems) return <EmptyBankState />;
  if (derived.filtered.length === 0)
    return (
      <EmptyFilteredState onClearFilters={controllers.filters.clearFilters} />
    );
  return <QuestionList filtered={derived.filtered} controllers={controllers} />;
}
