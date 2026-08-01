import { useMemo } from "react";

import type {
  InterviewOutcomeAuthoring,
  InterviewQuestionAuthoring,
} from "@/lib/api/types";
import type { OutcomeMeta, OutcomeOption, QuestionDifficulty } from "./types";

/**
 * Read-only projections of the question + outcome props, extracted from the
 * former 2.4k-line question-bank.tsx. Pure `useMemo` derivations with the same
 * dependency arrays, so each recomputes at exactly the same times as before.
 */
export interface QuestionDerived {
  sorted: InterviewQuestionAuthoring[];
  outcomeById: Map<string, OutcomeMeta>;
  outcomeOptions: OutcomeOption[];
  approvedCount: number;
  pendingQuestions: InterviewQuestionAuthoring[];
  presentDifficulties: QuestionDifficulty[];
  presentTypes: string[];
  statusCounts: Record<string, number>;
}

export function useQuestionDerived(options: {
  questions: InterviewQuestionAuthoring[];
  outcomes: InterviewOutcomeAuthoring[];
}): QuestionDerived {
  const { questions, outcomes } = options;

  // Position-ordered view; positions map to the visible "01, 02…" numbers.
  const sorted = useMemo(
    () => [...questions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [questions],
  );

  // Outcome lookup: id → { label: "LO{n}", text } for metadata + search.
  const outcomeById = useMemo(() => {
    const sortedOutcomes = [...outcomes].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
    const map = new Map<string, { label: string; text: string }>();
    sortedOutcomes.forEach((o, i) => {
      map.set(o.id, { label: `LO${i + 1}`, text: o.outcome_text ?? "" });
    });
    return map;
  }, [outcomes]);

  // Ordered [id, label, text] options for the edit-form outcome picker.
  const outcomeOptions = useMemo(
    () =>
      [...outcomes]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((o, i) => ({
          id: o.id,
          label: `LO${i + 1}`,
          text: o.outcome_text ?? "",
        })),
    [outcomes],
  );

  const approvedCount = useMemo(
    () => sorted.filter((q) => q.review_status === "approved").length,
    [sorted],
  );
  const pendingQuestions = useMemo(
    () => sorted.filter((q) => q.review_status !== "approved"),
    [sorted],
  );

  // Distinct difficulties / types actually present (for filter dropdowns).
  const presentDifficulties = useMemo(
    () =>
      Array.from(
        new Set(sorted.map((q) => q.difficulty).filter(Boolean)),
      ) as NonNullable<InterviewQuestionAuthoring["difficulty"]>[],
    [sorted],
  );
  const presentTypes = useMemo(
    () => Array.from(new Set(sorted.map((q) => q.question_type))),
    [sorted],
  );

  // Count of questions per review status (over the full pool, not the filtered
  // view) so filter options and the "pending only" quick filter can show how
  // many they'll surface before you click.
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of sorted) {
      counts[q.review_status] = (counts[q.review_status] ?? 0) + 1;
    }
    return counts;
  }, [sorted]);

  return {
    sorted,
    outcomeById,
    outcomeOptions,
    approvedCount,
    pendingQuestions,
    presentDifficulties,
    presentTypes,
    statusCounts,
  };
}
