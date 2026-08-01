import * as React from "react";
import type { DataTableColumn, SortState } from "./types";

export interface UseDataTableSortOptions<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  controlledSort: SortState | null | undefined;
  onSortChange: ((sort: SortState | null) => void) | undefined;
  manualSorting: boolean;
}

export interface DataTableSortController<T> {
  activeSort: SortState | null;
  handleHeaderSort: (colId: string) => void;
  sortedData: T[];
}

export function useDataTableSort<T>({
  data,
  columns,
  controlledSort,
  onSortChange,
  manualSorting,
}: UseDataTableSortOptions<T>): DataTableSortController<T> {
  const [internalSort, setInternalSort] = React.useState<SortState | null>(
    null,
  );
  const activeSort =
    controlledSort !== undefined ? controlledSort : internalSort;
  const setSort = React.useCallback(
    (next: SortState | null) => {
      onSortChange?.(next);
      if (controlledSort === undefined) setInternalSort(next);
    },
    [onSortChange, controlledSort],
  );

  const handleHeaderSort = React.useCallback(
    (colId: string) => {
      if (!activeSort || activeSort.columnId !== colId) {
        setSort({ columnId: colId, direction: "asc" });
      } else if (activeSort.direction === "asc") {
        setSort({ columnId: colId, direction: "desc" });
      } else {
        setSort(null);
      }
    },
    [activeSort, setSort],
  );

  // ── Sorted data (skipped in manual/server mode) ──────────────────────────
  const sortedData = React.useMemo(() => {
    if (manualSorting) return data;
    if (!activeSort || !activeSort.direction) return data;
    const col = columns.find((c) => c.id === activeSort.columnId);
    if (!col?.sortValue) return data;
    const dir = activeSort.direction === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [data, activeSort, columns, manualSorting]);

  return { activeSort, handleHeaderSort, sortedData };
}
