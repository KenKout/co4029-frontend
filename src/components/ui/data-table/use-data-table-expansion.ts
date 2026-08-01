import * as React from "react";
import type { FlatRow } from "./types";

function collectAllIds<T>(
  rows: T[],
  getRowId: (r: T) => string,
  getSubRows?: (r: T) => T[] | undefined,
): string[] {
  const ids: string[] = [];
  const walk = (list: T[]) => {
    for (const r of list) {
      ids.push(getRowId(r));
      const kids = getSubRows?.(r);
      if (kids && kids.length) walk(kids);
    }
  };
  walk(rows);
  return ids;
}

export interface UseDataTableExpansionOptions<T> {
  data: T[];
  pageRows: T[];
  getRowId: (row: T) => string;
  getSubRows: ((row: T) => T[] | undefined) | undefined;
  defaultExpanded: boolean;
}

export interface DataTableExpansionController<T> {
  flatRows: FlatRow<T>[];
  toggleExpanded: (id: string) => void;
}

export function useDataTableExpansion<T>({
  data,
  pageRows,
  getRowId,
  getSubRows,
  defaultExpanded,
}: UseDataTableExpansionOptions<T>): DataTableExpansionController<T> {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    if (defaultExpanded && getSubRows) {
      return new Set(collectAllIds(data, getRowId, getSubRows));
    }
    return new Set();
  });

  const toggleExpanded = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Flatten the visible (page) rows honoring expansion + depth.
  const flatRows = React.useMemo(() => {
    const out: FlatRow<T>[] = [];
    const walk = (rows: T[], depth: number) => {
      for (const row of rows) {
        const id = getRowId(row);
        const kids = getSubRows?.(row);
        const hasChildren = Boolean(kids && kids.length);
        const isExpanded = hasChildren && expanded.has(id);
        out.push({ row, id, depth, hasChildren, expanded: isExpanded });
        if (isExpanded && kids) walk(kids, depth + 1);
      }
    };
    walk(pageRows, 0);
    return out;
  }, [pageRows, expanded, getRowId, getSubRows]);

  return { flatRows, toggleExpanded };
}
