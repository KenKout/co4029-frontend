import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  ALIGN_CLASS,
  STICKY_ACTION_BASE,
  type DataTableColumn,
  type FlatRow,
} from "./types";

function DataTableCell<T>({
  col,
  row,
  id,
  isFirst,
  hierarchical,
  depth,
  hasChildren,
  isExp,
  onToggleExpanded,
}: {
  col: DataTableColumn<T>;
  row: T;
  id: string;
  isFirst: boolean;
  hierarchical: boolean;
  depth: number;
  hasChildren: boolean;
  isExp: boolean;
  onToggleExpanded: (id: string) => void;
}) {
  return (
    <TableCell
      className={cn(col.align && ALIGN_CLASS[col.align], col.cellClassName)}
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
                onToggleExpanded(id);
              }}
              aria-label={isExp ? "Collapse row" : "Expand row"}
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
}

interface DataTableRowProps<T> {
  flat: FlatRow<T>;
  columns: DataTableColumn<T>[];
  selectable: boolean;
  isSelected: boolean;
  onToggleRowSelected: (id: string) => void;
  hierarchical: boolean;
  onToggleExpanded: (id: string) => void;
  onRowClick: ((row: T) => void) | undefined;
  rowClassName: ((row: T) => string | undefined) | undefined;
  hasActions: boolean;
  actions: ((row: T) => React.ReactNode) | undefined;
}

function DataTableBodyRow<T>({
  flat,
  columns,
  selectable,
  isSelected,
  onToggleRowSelected,
  hierarchical,
  onToggleExpanded,
  onRowClick,
  rowClassName,
  hasActions,
  actions,
}: DataTableRowProps<T>) {
  const { row, id, depth, hasChildren, expanded: isExp } = flat;
  return (
    <TableRow
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      className={cn(
        "group hover:bg-m3-surface-container-low",
        onRowClick && "cursor-pointer",
        rowClassName?.(row),
      )}
    >
      {selectable && (
        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
          {depth === 0 && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleRowSelected(id)}
              aria-label="Select row"
            />
          )}
        </TableCell>
      )}

      {columns.map((col, colIdx) => (
        <DataTableCell<T>
          key={col.id}
          col={col}
          row={row}
          id={id}
          isFirst={colIdx === 0}
          hierarchical={hierarchical}
          depth={depth}
          hasChildren={hasChildren}
          isExp={isExp}
          onToggleExpanded={onToggleExpanded}
        />
      ))}

      {hasActions && (
        <TableCell
          onClick={(e) => e.stopPropagation()}
          className={cn(
            STICKY_ACTION_BASE,
            "w-px bg-m3-surface-container-lowest text-right",
            onRowClick && "group-hover:bg-m3-surface-container-low",
          )}
        >
          {actions?.(row)}
        </TableCell>
      )}
    </TableRow>
  );
}

function LoadingRows({
  loadingRowCount,
  totalCols,
}: {
  loadingRowCount: number;
  totalCols: number;
}) {
  return (
    <>
      {Array.from({ length: loadingRowCount }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          <TableCell colSpan={totalCols}>
            <div className="h-9 animate-pulse rounded-lg bg-m3-surface-container-low" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyRow({
  totalCols,
  emptyState,
}: {
  totalCols: number;
  emptyState: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell colSpan={totalCols}>
        <div className="py-10 text-center text-sm text-m3-on-surface-variant">
          {emptyState ?? "No data"}
        </div>
      </TableCell>
    </TableRow>
  );
}

export interface DataTableBodyProps<T> {
  loading: boolean;
  loadingRowCount: number;
  emptyState: React.ReactNode;
  flatRows: FlatRow<T>[];
  columns: DataTableColumn<T>[];
  selectable: boolean;
  selected: Set<string>;
  onToggleRowSelected: (id: string) => void;
  hierarchical: boolean;
  onToggleExpanded: (id: string) => void;
  onRowClick: ((row: T) => void) | undefined;
  rowClassName: ((row: T) => string | undefined) | undefined;
  hasActions: boolean;
  actions: ((row: T) => React.ReactNode) | undefined;
}

export function DataTableBody<T>({
  loading,
  loadingRowCount,
  emptyState,
  flatRows,
  columns,
  selectable,
  selected,
  onToggleRowSelected,
  hierarchical,
  onToggleExpanded,
  onRowClick,
  rowClassName,
  hasActions,
  actions,
}: DataTableBodyProps<T>) {
  const totalCols =
    (selectable ? 1 : 0) + columns.length + (hasActions ? 1 : 0);
  return (
    <TableBody>
      {loading ? (
        <LoadingRows loadingRowCount={loadingRowCount} totalCols={totalCols} />
      ) : flatRows.length === 0 ? (
        <EmptyRow totalCols={totalCols} emptyState={emptyState} />
      ) : (
        flatRows.map((flat) => (
          <DataTableBodyRow<T>
            key={flat.id}
            flat={flat}
            columns={columns}
            selectable={selectable}
            isSelected={selected.has(flat.id)}
            onToggleRowSelected={onToggleRowSelected}
            hierarchical={hierarchical}
            onToggleExpanded={onToggleExpanded}
            onRowClick={onRowClick}
            rowClassName={rowClassName}
            hasActions={hasActions}
            actions={actions}
          />
        ))
      )}
    </TableBody>
  );
}
