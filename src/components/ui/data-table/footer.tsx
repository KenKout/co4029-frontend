import { DataTablePagination } from "./pagination";

export interface DataTableFooterProps {
  pagination: boolean;
  loading: boolean;
  selectable: boolean;
  page: number;
  pageCount: number;
  size: number;
  total: number;
  pageSizeOptions: number[] | undefined;
  selectedCount: number;
  setPage: (next: number) => void;
  setSize: (next: number) => void;
}

export function DataTableFooter({
  pagination,
  loading,
  selectable,
  page,
  pageCount,
  size,
  total,
  pageSizeOptions,
  selectedCount,
  setPage,
  setSize,
}: DataTableFooterProps) {
  if (!pagination || loading || total <= 0) return null;
  return (
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
  );
}
