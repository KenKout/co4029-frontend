import { cn } from "@/lib/utils";
import { Table } from "@/components/ui/table";
import { DataTableBody } from "./data-table/body";
import { DataTableFooter } from "./data-table/footer";
import { DataTableHeaderRow } from "./data-table/header-row";
import type { DataTableProps } from "./data-table/types";
import { useDataTableExpansion } from "./data-table/use-data-table-expansion";
import { useDataTablePagination } from "./data-table/use-data-table-pagination";
import { useDataTableSelection } from "./data-table/use-data-table-selection";
import { useDataTableSort } from "./data-table/use-data-table-sort";

export type {
  DataTableAlign,
  DataTableColumn,
  DataTableProps,
  SortDirection,
  SortState,
} from "./data-table/types";

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

  const { activeSort, handleHeaderSort, sortedData } = useDataTableSort<T>({
    data,
    columns,
    controlledSort,
    onSortChange,
    manualSorting,
  });

  const { page, size, total, pageCount, setPage, setSize, pageRows } =
    useDataTablePagination<T>({
      sortedData,
      pagination,
      manualPagination,
      pageSize,
      rowCount,
      controlledPage,
      onPageChange,
      onPageSizeChange,
    });

  const { flatRows, toggleExpanded } = useDataTableExpansion<T>({
    data,
    pageRows,
    getRowId,
    getSubRows,
    defaultExpanded,
  });

  const {
    selected,
    selectedCount,
    allSelected,
    someSelected,
    toggleRowSelected,
    toggleSelectAll,
  } = useDataTableSelection<T>({
    data,
    getRowId,
    selectedIds,
    onSelectedIdsChange,
  });

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
          <DataTableHeaderRow<T>
            columns={columns}
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleSelectAll={toggleSelectAll}
            activeSort={activeSort}
            onHeaderSort={handleHeaderSort}
            hasActions={hasActions}
            actionsHeader={actionsHeader}
          />

          <DataTableBody<T>
            loading={loading}
            loadingRowCount={loadingRowCount}
            emptyState={emptyState}
            flatRows={flatRows}
            columns={columns}
            selectable={selectable}
            selected={selected}
            onToggleRowSelected={toggleRowSelected}
            hierarchical={hierarchical}
            onToggleExpanded={toggleExpanded}
            onRowClick={onRowClick}
            rowClassName={rowClassName}
            hasActions={hasActions}
            actions={actions}
          />
        </Table>
      </div>

      <DataTableFooter
        pagination={pagination}
        loading={loading}
        selectable={selectable}
        page={page}
        pageCount={pageCount}
        size={size}
        total={total}
        pageSizeOptions={pageSizeOptions}
        selectedCount={selectedCount}
        setPage={setPage}
        setSize={setSize}
      />
    </div>
  );
}
