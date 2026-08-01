import * as React from "react";

export interface UseDataTablePaginationOptions<T> {
  sortedData: T[];
  pagination: boolean;
  manualPagination: boolean;
  pageSize: number;
  rowCount: number | undefined;
  controlledPage: number | undefined;
  onPageChange: ((page: number) => void) | undefined;
  onPageSizeChange: ((size: number) => void) | undefined;
}

export interface DataTablePaginationController<T> {
  page: number;
  size: number;
  total: number;
  pageCount: number;
  setPage: (next: number) => void;
  setSize: (next: number) => void;
  pageRows: T[];
}

export function useDataTablePagination<T>({
  sortedData,
  pagination,
  manualPagination,
  pageSize,
  rowCount,
  controlledPage,
  onPageChange,
  onPageSizeChange,
}: UseDataTablePaginationOptions<T>): DataTablePaginationController<T> {
  const [internalSize, setInternalSize] = React.useState(pageSize);
  const [internalPage, setInternalPage] = React.useState(0);
  const size = manualPagination ? pageSize : internalSize;
  const page = manualPagination ? (controlledPage ?? 0) : internalPage;
  const total = manualPagination
    ? (rowCount ?? sortedData.length)
    : sortedData.length;
  const pageCount = pagination ? Math.max(1, Math.ceil(total / size)) : 1;

  const setPage = React.useCallback(
    (next: number) => {
      if (manualPagination) onPageChange?.(next);
      else setInternalPage(next);
    },
    [manualPagination, onPageChange],
  );
  const setSize = React.useCallback(
    (next: number) => {
      if (manualPagination) onPageSizeChange?.(next);
      else {
        setInternalSize(next);
        setInternalPage(0);
      }
    },
    [manualPagination, onPageSizeChange],
  );

  React.useEffect(() => {
    if (!manualPagination && internalPage > pageCount - 1)
      setInternalPage(pageCount - 1);
  }, [manualPagination, internalPage, pageCount]);

  const pageRows = React.useMemo(() => {
    // Server mode already hands us the current page; never slice.
    if (!pagination || manualPagination) return sortedData;
    const start = page * size;
    return sortedData.slice(start, start + size);
  }, [sortedData, pagination, manualPagination, page, size]);

  return { page, size, total, pageCount, setPage, setSize, pageRows };
}
