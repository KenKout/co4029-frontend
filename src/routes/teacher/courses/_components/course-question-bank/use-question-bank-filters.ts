import { useState } from "react";

import type {
  InterviewDifficulty,
  InterviewQuestionType,
} from "@/lib/api/types";

/**
 * The four filter dimensions of the course-level Question Bank, extracted from
 * the former 843-line course-question-bank.tsx. Same four `useState` calls in
 * the same order, so the orchestrator's hook sequence is unchanged.
 */
export interface QuestionBankFiltersController {
  search: string;
  setSearch: (value: string) => void;
  typeFilter: InterviewQuestionType | "all";
  setTypeFilter: (value: InterviewQuestionType | "all") => void;
  difficultyFilter: InterviewDifficulty | "all";
  setDifficultyFilter: (value: InterviewDifficulty | "all") => void;
  tagFilter: string;
  setTagFilter: (value: string) => void;
  anyFilterActive: boolean;
  clearFilters: () => void;
}

export function useQuestionBankFilters(): QuestionBankFiltersController {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<InterviewQuestionType | "all">(
    "all",
  );
  const [difficultyFilter, setDifficultyFilter] = useState<
    InterviewDifficulty | "all"
  >("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const anyFilterActive =
    search.trim() !== "" ||
    typeFilter !== "all" ||
    difficultyFilter !== "all" ||
    tagFilter !== "all";

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setDifficultyFilter("all");
    setTagFilter("all");
  }

  return {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    difficultyFilter,
    setDifficultyFilter,
    tagFilter,
    setTagFilter,
    anyFilterActive,
    clearFilters,
  };
}
