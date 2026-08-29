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

  // Ids the expansion state has already seen. Drives "auto-expand fresh
  // rows": when `defaultExpanded` is on, any row id that appears AFTER mount
  // (async data arriving, filters changing, a new page) is expanded — while
  // rows the user has already seen stay in whatever state they left them
  // (e.g. a collapsed group stays collapsed across refetches). Without this,
  // defaultExpanded only applied to the data present at mount time, which is
  // usually empty while loading.
  const seenIds = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!defaultExpanded || !getSubRows) return;
    const freshIds = collectAllIds(data, getRowId, getSubRows).filter(
      (id) => !seenIds.current.has(id),
    );
    if (freshIds.length === 0) return;
    for (const id of freshIds) seenIds.current.add(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of freshIds) next.add(id);
      return next;
    });
  }, [data, defaultExpanded, getRowId, getSubRows]);

  const toggleExpanded = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Flatten the visible (page) rows honoring expansion + depth.
  // `pathIds` guards against cyclic sub-row graphs (a row that returns
  // itself, or descendants that loop back): without it a malformed
  // getSubRows would recurse until the stack blows up.
  const flatRows = React.useMemo(() => {
    const out: FlatRow<T>[] = [];
    const walk = (rows: T[], depth: number, pathIds: Set<string>) => {
      for (const row of rows) {
        const id = getRowId(row);
        const kids = getSubRows?.(row);
        const hasChildren = Boolean(kids && kids.length);
        const isExpanded = hasChildren && expanded.has(id);
        out.push({ row, id, depth, hasChildren, expanded: isExpanded });
        if (isExpanded && kids && !pathIds.has(id)) {
          const nextPath = new Set(pathIds);
          nextPath.add(id);
          walk(kids, depth + 1, nextPath);
        }
      }
    };
    walk(pageRows, 0, new Set());
    return out;
  }, [pageRows, expanded, getRowId, getSubRows]);

  return { flatRows, toggleExpanded };
}
