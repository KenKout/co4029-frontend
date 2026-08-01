import * as React from "react";

export interface UseDataTableSelectionOptions<T> {
  data: T[];
  getRowId: (row: T) => string;
  selectedIds: Set<string> | undefined;
  onSelectedIdsChange: ((ids: Set<string>) => void) | undefined;
}

export interface DataTableSelectionController {
  selected: Set<string>;
  selectedCount: number;
  allSelected: boolean;
  someSelected: boolean;
  toggleRowSelected: (id: string) => void;
  toggleSelectAll: () => void;
}

export function useDataTableSelection<T>({
  data,
  getRowId,
  selectedIds,
  onSelectedIdsChange,
}: UseDataTableSelectionOptions<T>): DataTableSelectionController {
  const [internalSelected, setInternalSelected] = React.useState<Set<string>>(
    new Set(),
  );
  const selected = selectedIds ?? internalSelected;
  const setSelected = React.useCallback(
    (next: Set<string>) => {
      onSelectedIdsChange?.(next);
      if (selectedIds === undefined) setInternalSelected(next);
    },
    [onSelectedIdsChange, selectedIds],
  );

  const topLevelIds = React.useMemo(() => data.map(getRowId), [data, getRowId]);
  const selectedCount = topLevelIds.filter((id) => selected.has(id)).length;
  const allSelected =
    topLevelIds.length > 0 && selectedCount === topLevelIds.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleRowSelected = React.useCallback(
    (id: string) => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelected(next);
    },
    [selected, setSelected],
  );

  const toggleSelectAll = React.useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(topLevelIds));
  }, [allSelected, topLevelIds, setSelected]);

  return {
    selected,
    selectedCount,
    allSelected,
    someSelected,
    toggleRowSelected,
    toggleSelectAll,
  };
}
