import * as React from "react";

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

export interface FlatRow<T> {
  row: T;
  id: string;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

export const ALIGN_CLASS: Record<DataTableAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export const STICKY_ACTION_BASE =
  "sticky right-0 border-l border-m3-outline-variant/10";
