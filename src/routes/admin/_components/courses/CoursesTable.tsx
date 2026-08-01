import { DataTable } from "@/components/ui/data-table";

import { CoursesToolbar } from "./CoursesToolbar";
import { DeleteButton } from "./DeleteButton";
import { RestoreButton } from "./RestoreButton";
import type { AdminCoursesController } from "./use-admin-courses";

export function CoursesTable({ c }: { c: AdminCoursesController }) {
  const { t, navigate, table, columns } = c;
  return (
    <DataTable
      columns={columns}
      data={table.rows}
      getRowId={(course) => course.id}
      loading={table.isLoading}
      onRowClick={(course) =>
        void navigate({
          to: "/admin/courses/$courseId",
          params: { courseId: course.id },
        })
      }
      actions={(course) =>
        course.deleted_at != null ? (
          <RestoreButton course={course} />
        ) : (
          <DeleteButton course={course} />
        )
      }
      pagination
      manualPagination
      manualSorting
      rowCount={table.total}
      page={table.page}
      pageSize={table.pageSize}
      onPageChange={table.setPage}
      onPageSizeChange={table.setPageSize}
      pageSizeOptions={[25, 50, 100]}
      sort={table.sort}
      onSortChange={table.setSort}
      emptyState={
        table.search
          ? t("admin.courses_list.empty_search", {
              defaultValue: "No matching courses",
            })
          : t("admin.courses_list.empty_title")
      }
      toolbar={<CoursesToolbar c={c} />}
    />
  );
}
