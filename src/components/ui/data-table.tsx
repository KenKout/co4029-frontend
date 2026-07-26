import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DataTableAlign = "left" | "center" | "right";
export type SortDirection = "asc" | "desc" | null;
export interface SortState {
  columnId: string;
  direction: SortDirection;
}

export interface DataTableColumn<T> {
  /** Stable key for the column. */
  id: string;
  /** Header content (string or node). */
  header: React.ReactNode;
  /** Cell renderer for a row. */
  cell: (row: T) => React.ReactNode;
  align?: DataTableAlign;
  /** Fixed column width, e.g. `120` or `"12rem"`. */
  width?: number | string;
  headerClassName?: string;
  cellClassName?: string;
  /** `title` attribute on the header cell (tooltip for short labels). */
  headerTitle?: string;
  /** Enable client-side sorting for this column. */
  sortable?: boolean;
  /** Value accessor for sorting. Required when `sortable` is true. */
  sortValue?: (row: T) => string | number | Date;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Stable row id — used for selection, expansion and React keys. */
  getRowId: (row: T) => string;

  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;

  // ── Selection (checkbox column) ──────────────────────────────────────────
  /** Show the leading checkbox column. */
  selectable?: boolean;
  /** Controlled selection. Omit for uncontrolled (internal) state. */
  selectedIds?: Set<string>;
  onSelectedIdsChange?: (ids: Set<string>) => void;

  // ── Pagination ───────────────────────────────────────────────────────────
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  /** Server-driven pagination: don't slice `data` (it's already the page),
   *  derive page count from `rowCount`, and drive page/size via callbacks. */
  manualPagination?: boolean;
  /** Total server-side row count (required in manual mode for page count). */
  rowCount?: number;
  /** Controlled current page (0-indexed) — manual mode. */
  page?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;

  // ── Hierarchy (expand/collapse nested rows) ──────────────────────────────
  /** Return a row's children to make it expandable; omit for a flat table. */
  getSubRows?: (row: T) => T[] | undefined;
  defaultExpanded?: boolean;

  // ── Sticky right-hand action column ──────────────────────────────────────
  actions?: (row: T) => React.ReactNode;
  actionsHeader?: React.ReactNode;

  // ── Sorting ─────────────────────────────────────────────────────────────
  /** Controlled sort state. Omit for uncontrolled (internal) state. */
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  /** Server-driven sorting: header clicks emit `onSortChange` but the
   *  component does NOT reorder `data` (the server returns it sorted). */
  manualSorting?: boolean;

  // ── States ───────────────────────────────────────────────────────────────
  loading?: boolean;
  loadingRowCount?: number;
  emptyState?: React.ReactNode;

  /** Wrap the table in a rounded bordered card (default). Set false to
   *  drop the border when embedding inside an existing card. */
  bordered?: boolean;
  className?: string;
  containerClassName?: string;

  /** Optional toolbar rendered above the table. */
  toolbar?: React.ReactNode;
}

const ALIGN_CLASS: Record<DataTableAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

interface FlatRow<T> {
  row: T;
  id: string;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

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

export function DataTable<T>({
  columns,
  data,
  getRowId,
  onRowClick,
  rowClassName,
  selectable = false,
  selectedIds,
  onSelectedIdsChange,
  pagination = false,
  pageSize = 10,
  pageSizeOptions,
  manualPagination = false,
  rowCount,
  page: controlledPage,
  onPageChange,
  onPageSizeChange,
  getSubRows,
  defaultExpanded = false,
  actions,
  actionsHeader,
  sort: controlledSort,
  onSortChange,
  manualSorting = false,
  loading = false,
  loadingRowCount = 5,
  emptyState,
  bordered = true,
  className,
  containerClassName,
  toolbar,
}: DataTableProps<T>) {
  const hasActions = Boolean(actions);
  const hierarchical = Boolean(getSubRows);

  // ── Sort state ─────────────────────────────────────────────────────────
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

  // ── Pagination state (controlled in manual/server mode) ──────────────────
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

  // ── Expansion state ──────────────────────────────────────────────────────
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

  // ── Selection state (top-level rows) ─────────────────────────────────────
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

  const totalCols =
    (selectable ? 1 : 0) + columns.length + (hasActions ? 1 : 0);

  const stickyActionBase =
    "sticky right-0 border-l border-m3-outline-variant/10";

  return (
    <div className={cn("space-y-3", containerClassName)}>
      {toolbar}
      <div
        className={cn(
          bordered &&
            "overflow-hidden rounded-xl bg-m3-surface-container-lowest ghost-border",
        )}
      >
        <Table className={className}>
          <TableHeader>
            <TableRow className="bg-m3-surface-container-low">
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all rows"
                  />
                </TableHead>
              )}
              {columns.map((col) => {
                const isSorted = activeSort?.columnId === col.id;
                const dir = isSorted ? activeSort?.direction : null;
                return (
                  <TableHead
                    key={col.id}
                    title={col.headerTitle}
                    style={col.width ? { width: col.width } : undefined}
                    aria-sort={
                      col.sortable
                        ? isSorted
                          ? dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                    className={cn(
                      col.align && ALIGN_CLASS[col.align],
                      col.headerClassName,
                      col.sortable && "cursor-pointer select-none",
                    )}
                    onClick={
                      col.sortable ? () => handleHeaderSort(col.id) : undefined
                    }
                  >
                    {col.sortable ? (
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        <span
                          className={cn(
                            "inline-flex h-4 w-4 shrink-0 items-center justify-center",
                            isSorted
                              ? "text-m3-primary"
                              : "text-m3-on-surface-variant/40",
                          )}
                        >
                          {dir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : dir === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </span>
                      </span>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                );
              })}
              {hasActions && (
                <TableHead
                  className={cn(
                    stickyActionBase,
                    "w-px bg-m3-surface-container-low text-right",
                  )}
                >
                  {actionsHeader}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: loadingRowCount }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={totalCols}>
                    <div className="h-9 animate-pulse rounded-lg bg-m3-surface-container-low" />
                  </TableCell>
                </TableRow>
              ))
            ) : flatRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalCols}>
                  <div className="py-10 text-center text-sm text-m3-on-surface-variant">
                    {emptyState ?? "No data"}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              flatRows.map(
                ({ row, id, depth, hasChildren, expanded: isExp }) => (
                  <TableRow
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "group hover:bg-m3-surface-container-low",
                      onRowClick && "cursor-pointer",
                      rowClassName?.(row),
                    )}
                  >
                    {selectable && (
                      <TableCell
                        className="w-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {depth === 0 && (
                          <Checkbox
                            checked={selected.has(id)}
                            onCheckedChange={() => toggleRowSelected(id)}
                            aria-label="Select row"
                          />
                        )}
                      </TableCell>
                    )}

                    {columns.map((col, colIdx) => {
                      const isFirst = colIdx === 0;
                      return (
                        <TableCell
                          key={col.id}
                          className={cn(
                            col.align && ALIGN_CLASS[col.align],
                            col.cellClassName,
                          )}
                          style={
                            isFirst && hierarchical && depth > 0
                              ? { paddingLeft: 16 + depth * 24 }
                              : undefined
                          }
                        >
                          {isFirst && hierarchical ? (
                            <span className="flex items-center gap-1.5">
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpanded(id);
                                  }}
                                  aria-label={
                                    isExp ? "Collapse row" : "Expand row"
                                  }
                                  aria-expanded={isExp}
                                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-m3-on-surface-variant hover:bg-m3-surface-container-high cursor-pointer"
                                >
                                  {isExp ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              ) : (
                                <span className="inline-block h-5 w-5 shrink-0" />
                              )}
                              <span className="min-w-0">{col.cell(row)}</span>
                            </span>
                          ) : (
                            col.cell(row)
                          )}
                        </TableCell>
                      );
                    })}

                    {hasActions && (
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          stickyActionBase,
                          "w-px bg-m3-surface-container-lowest text-right",
                          onRowClick &&
                            "group-hover:bg-m3-surface-container-low",
                        )}
                      >
                        {actions?.(row)}
                      </TableCell>
                    )}
                  </TableRow>
                ),
              )
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && !loading && total > 0 && (
        <DataTablePagination
          page={page}
          pageCount={pageCount}
          size={size}
          total={total}
          pageSizeOptions={pageSizeOptions}
          selectedCount={selectable ? selectedCount : undefined}
          onPageChange={setPage}
          onSizeChange={(s) => {
            setSize(s);
            setPage(0);
          }}
        />
      )}
    </div>
  );
}

function DataTablePagination({
  page,
  pageCount,
  size,
  total,
  pageSizeOptions,
  selectedCount,
  onPageChange,
  onSizeChange,
}: {
  page: number;
  pageCount: number;
  size: number;
  total: number;
  pageSizeOptions?: number[];
  selectedCount?: number;
  onPageChange: (p: number) => void;
  onSizeChange: (s: number) => void;
}) {
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-m3-on-surface-variant">
      <div className="flex items-center gap-4">
        <span>
          {from}–{to} of {total}
        </span>
        {selectedCount !== undefined && selectedCount > 0 && (
          <span className="text-m3-primary font-semibold">
            {selectedCount} selected
          </span>
        )}
        {pageSizeOptions && pageSizeOptions.length > 0 && (
          <label className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows</span>
            {/* Page size is stored as a number; the Select API is string-based,
                so convert at the boundary and leave the state type alone. */}
            <Select
              size="sm"
              aria-label="Rows per page"
              value={String(size)}
              onValueChange={(next) => onSizeChange(Number(next))}
              options={pageSizeOptions.map((opt) => ({
                value: String(opt),
                label: String(opt),
              }))}
              className="w-auto"
            />
          </label>
        )}
      </div>

      <div className="flex items-center gap-1">
        <span className="mr-2 tabular-nums">
          Page {page + 1} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page === 0}
          onClick={() => onPageChange(0)}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(pageCount - 1)}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
