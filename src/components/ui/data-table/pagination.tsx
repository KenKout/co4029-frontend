import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function DataTablePagination({
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
