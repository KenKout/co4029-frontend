import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ALIGN_CLASS,
  STICKY_ACTION_BASE,
  type DataTableColumn,
  type SortDirection,
  type SortState,
} from "./types";

function SortIndicator({
  isSorted,
  dir,
}: {
  isSorted: boolean;
  dir: SortDirection;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-4 w-4 shrink-0 items-center justify-center",
        isSorted ? "text-m3-primary" : "text-m3-on-surface-variant/40",
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
  );
}

function DataTableHeadCell<T>({
  col,
  isSorted,
  dir,
  onHeaderSort,
}: {
  col: DataTableColumn<T>;
  isSorted: boolean;
  dir: SortDirection;
  onHeaderSort: (colId: string) => void;
}) {
  return (
    <TableHead
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
      onClick={col.sortable ? () => onHeaderSort(col.id) : undefined}
    >
      {col.sortable ? (
        <span className="inline-flex items-center gap-1">
          {col.header}
          <SortIndicator isSorted={isSorted} dir={dir} />
        </span>
      ) : (
        col.header
      )}
    </TableHead>
  );
}

export interface DataTableHeaderProps<T> {
  columns: DataTableColumn<T>[];
  selectable: boolean;
  allSelected: boolean;
  someSelected: boolean;
  onToggleSelectAll: () => void;
  activeSort: SortState | null;
  onHeaderSort: (colId: string) => void;
  hasActions: boolean;
  actionsHeader: React.ReactNode;
}

export function DataTableHeaderRow<T>({
  columns,
  selectable,
  allSelected,
  someSelected,
  onToggleSelectAll,
  activeSort,
  onHeaderSort,
  hasActions,
  actionsHeader,
}: DataTableHeaderProps<T>) {
  return (
    <TableHeader>
      <TableRow className="bg-m3-surface-container-low">
        {selectable && (
          <TableHead className="w-10">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={onToggleSelectAll}
              aria-label="Select all rows"
            />
          </TableHead>
        )}
        {columns.map((col) => {
          const isSorted = activeSort?.columnId === col.id;
          const dir = isSorted ? (activeSort?.direction ?? null) : null;
          return (
            <DataTableHeadCell<T>
              key={col.id}
              col={col}
              isSorted={isSorted}
              dir={dir}
              onHeaderSort={onHeaderSort}
            />
          );
        })}
        {hasActions && (
          <TableHead
            className={cn(
              STICKY_ACTION_BASE,
              "w-px bg-m3-surface-container-low text-right",
            )}
          >
            {actionsHeader}
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
}
