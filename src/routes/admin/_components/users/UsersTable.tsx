import { DataTable } from "@/components/ui/data-table";

import { UsersToolbar } from "./UsersToolbar";
import type { AdminUsersController } from "./use-admin-users";

export function UsersTable({ c }: { c: AdminUsersController }) {
  const { t, navigate, table, columns } = c;
  return (
    <DataTable
      columns={columns}
      data={table.rows}
      getRowId={(u) => u.id}
      loading={table.isLoading}
      onRowClick={(u) =>
        void navigate({
          to: "/admin/users/$userId",
          params: { userId: u.id },
        })
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
        table.search || table.roleFilter || table.orgFilter
          ? t("admin.users.empty_search", {
              defaultValue: "No matching users",
            })
          : t("admin.users.empty_title", { defaultValue: "No users yet" })
      }
      toolbar={<UsersToolbar c={c} />}
    />
  );
}
