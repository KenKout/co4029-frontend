import { useEffect, useMemo, useRef, useState } from "react";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import { buildQuestionFilterPredicate } from "./helpers";
import type {
  OutcomeFilterValue,
  OutcomeMeta,
  QuestionFilterValues,
  ReviewStatus,
  SourceFilterValue,
  StatusFilterValue,
} from "./types";

/**
 * Filtering state for the Question Bank, extracted from the former 2.4k-line
 * question-bank.tsx. Owns the six filter dimensions, the external
 * "View questions" outcome signal, and the filtered projection of the
 * position-sorted question list. Same state, same effect, same memo deps.
 */
export interface QuestionFiltersController {
  filters: QuestionFilterValues;
  setSearch: (v: string) => void;
  setStatusFilter: (v: StatusFilterValue) => void;
  setOutcomeFilter: (v: OutcomeFilterValue) => void;
  setDifficultyFilter: (v: string) => void;
  setTypeFilter: (v: string) => void;
  setSourceFilter: (v: SourceFilterValue) => void;
  anyFilterActive: boolean;
  clearFilters: () => void;
  filtered: InterviewQuestionAuthoring[];
}

export function useQuestionFilters(options: {
  sorted: InterviewQuestionAuthoring[];
  outcomeById: Map<string, OutcomeMeta>;
  /**
   * External request to filter by a specific outcome (from the Learning
   * Outcomes "View questions" action). The `nonce` lets the same outcome be
   * re-requested; the effect re-runs whenever it changes.
   */
  outcomeFilterSignal?: { id: string | "none"; nonce: number } | null;
}): QuestionFiltersController {
  const { sorted, outcomeById, outcomeFilterSignal } = options;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string | "all" | "none">(
    "all",
  );
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "ai" | "manual">(
    "all",
  );

  // React to an external "View questions" request from Learning Outcomes:
  // clear other filters, scope to the requested outcome, and reset search so
  // the assigned questions are unambiguous.
  const lastSignalNonce = useRef<number>(-1);
  useEffect(() => {
    if (!outcomeFilterSignal) return;
    if (outcomeFilterSignal.nonce === lastSignalNonce.current) return;
    lastSignalNonce.current = outcomeFilterSignal.nonce;
    setSearch("");
    setStatusFilter("all");
    setDifficultyFilter("all");
    setTypeFilter("all");
    setSourceFilter("all");
    setOutcomeFilter(outcomeFilterSignal.id);
  }, [outcomeFilterSignal]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      sorted.filter(
        buildQuestionFilterPredicate({
          filters: {
            search,
            statusFilter,
            outcomeFilter,
            difficultyFilter,
            typeFilter,
            sourceFilter,
          },
          outcomeById,
        }),
      ),
    [
      sorted,
      search,
      statusFilter,
      outcomeFilter,
      difficultyFilter,
      typeFilter,
      sourceFilter,
      outcomeById,
    ],
  );

  const anyFilterActive =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    outcomeFilter !== "all" ||
    difficultyFilter !== "all" ||
    typeFilter !== "all" ||
    sourceFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setOutcomeFilter("all");
    setDifficultyFilter("all");
    setTypeFilter("all");
    setSourceFilter("all");
  }

  return {
    filters: {
      search,
      statusFilter,
      outcomeFilter,
      difficultyFilter,
      typeFilter,
      sourceFilter,
    },
    setSearch,
    setStatusFilter,
    setOutcomeFilter,
    setDifficultyFilter,
    setTypeFilter,
    setSourceFilter,
    anyFilterActive,
    clearFilters,
    filtered,
  };
}
