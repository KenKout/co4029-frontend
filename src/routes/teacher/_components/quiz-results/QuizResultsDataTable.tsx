import { DataTable, type DataTableProps } from "@/components/ui/data-table";
import { DataTablePagination } from "@/components/ui/data-table/pagination";
import { useDataTablePagination } from "@/components/ui/data-table/use-data-table-pagination";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50];

export function QuizResultsDataTable<T>({
  data,
  pageSize = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  ...props
}: DataTableProps<T> & {
  pageSize?: number;
  pageSizeOptions?: number[];
}) {
  const pagination = useDataTablePagination({
    sortedData: data,
    pagination: true,
    manualPagination: false,
    pageSize,
    rowCount: undefined,
    controlledPage: undefined,
    onPageChange: undefined,
    onPageSizeChange: undefined,
  });

  if (props.manualPagination) {
    const { containerClassName, ...tableProps } = props;
    return (
      <DataTable
        {...tableProps}
        data={data}
        containerClassName={undefined}
        tableContainerClassName={containerClassName}
        pagination
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
      />
    );
  }

  return (
    <div className="space-y-3">
      <DataTable {...props} data={pagination.pageRows} pagination={false} />
      {data.length > 0 && (
        <DataTablePagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          size={pagination.size}
          total={pagination.total}
          pageSizeOptions={pageSizeOptions}
          onPageChange={pagination.setPage}
          onSizeChange={pagination.setSize}
        />
      )}
    </div>
  );
}
