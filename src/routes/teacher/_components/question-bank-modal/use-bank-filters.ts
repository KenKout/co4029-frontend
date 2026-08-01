import { useState } from "react";

/**
 * The six filter selects plus the raw / debounced search terms, and the
 * reset-to-defaults action. `search` is set by the debounce effect in the
 * controller so the query only re-fetches 300 ms after typing stops.
 */
export function useBankFilters(defaultModuleId: string | undefined) {
  const [moduleId, setModuleId] = useState<string>(defaultModuleId ?? "");
  const [lessonId, setLessonId] = useState<string>("");
  const [questionType, setQuestionType] = useState<string>("");
  const [bloomLevel, setBloomLevel] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [reviewStatus, setReviewStatus] = useState<string>("approved");
  const [searchInput, setSearchInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  function resetFilters() {
    setModuleId(defaultModuleId ?? "");
    setLessonId("");
    setQuestionType("");
    setBloomLevel("");
    setDifficulty("");
    setReviewStatus("approved");
    setSearchInput("");
    setSearch("");
  }

  return {
    moduleId,
    setModuleId,
    lessonId,
    setLessonId,
    questionType,
    setQuestionType,
    bloomLevel,
    setBloomLevel,
    difficulty,
    setDifficulty,
    reviewStatus,
    setReviewStatus,
    searchInput,
    setSearchInput,
    setSearch,
    search,
    resetFilters,
  };
}

/** Checkbox selection across the (paginated) bank list. */
export function useBankSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  return { selected, setSelected, toggle, clearSelection };
}
