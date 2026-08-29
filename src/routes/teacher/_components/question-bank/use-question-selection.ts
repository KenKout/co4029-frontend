import { useEffect, useMemo, useState } from "react";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";

/**
 * Bulk selection for the Question Bank, extracted from the former 2.4k-line
 * question-bank.tsx.
 *
 * Selection operates over the currently FILTERED, non-deleting questions, so
 * "select all" means "all I can currently see". Selecting then changing a
 * filter keeps prior picks that are still visible and drops the rest.
 */
export function useQuestionSelection(options: {
  filtered: InterviewQuestionAuthoring[];
  deletingIds: Set<string>;
}) {
  const { filtered, deletingIds } = options;
  // Bulk selection: ids of questions ticked for a batch action.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectableIds = useMemo(
    () => filtered.filter((q) => !deletingIds.has(q.id)).map((q) => q.id),
    [filtered, deletingIds],
  );
  const selectableIdsKey = selectableIds.join(",");
  useEffect(() => {
    const visibleIds = new Set(selectableIds);
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [selectableIdsKey]);

  const selectedVisibleIds = useMemo(
    () => selectableIds.filter((id) => selectedIds.has(id)),
    [selectableIds, selectedIds],
  );
  const allVisibleSelected =
    selectableIds.length > 0 &&
    selectedVisibleIds.length === selectableIds.length;
  const someVisibleSelected =
    selectedVisibleIds.length > 0 && !allVisibleSelected;

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (
        selectableIds.length > 0 &&
        selectableIds.every((id) => prev.has(id))
      ) {
        // Everything visible is selected → clear the visible ones.
        const next = new Set(prev);
        for (const id of selectableIds) next.delete(id);
        return next;
      }
      // Otherwise select all visible (union with any off-screen picks).
      return new Set([...prev, ...selectableIds]);
    });
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }

  // Resolve only selected questions still visible in the current filter.
  const selectedQuestions = useMemo(
    () => filtered.filter((q) => selectedIds.has(q.id) && !deletingIds.has(q.id)),
    [filtered, selectedIds, deletingIds],
  );

  return {
    selectedIds,
    selectableIds,
    selectedVisibleIds,
    allVisibleSelected,
    someVisibleSelected,
    selectedQuestions,
    toggleSelected,
    toggleSelectAll,
    clearSelection,
  };
}
