import { DataTableToolbar, type FilterDef } from "@/components/ui/data-table-toolbar";

import type { AdminUsersController } from "./use-admin-users";

const ROLE_FILTER_ID = "role";
const ORG_FILTER_ID = "organization";

/**
 * Search box plus role and organization filter chips, built on the shared
 * DataTableToolbar so this toolbar matches the other admin tables (courses,
 * processing jobs). The role/org option lists are the same catalogs that
 * drive the Role column labels, so the filters can't drift from the data.
 * Values ride the server-table's built-in roleFilter/orgFilter state, which
 * sends `role` / `organization` query params.
 */
export function UsersToolbar({ c }: { c: AdminUsersController }) {
  const { t, table, roleOptions, orgOptions } = c;

  const filterDefs: FilterDef[] = [
    {
      id: ROLE_FILTER_ID,
      label: t("admin.users.filter_role", { defaultValue: "Filter by role" }),
      allLabel: t("admin.users.filter_role_all", {
        defaultValue: "All roles",
      }),
      options: roleOptions.map((r) => ({ value: r.code, label: r.name })),
    },
    {
      id: ORG_FILTER_ID,
      label: t("admin.users.filter_organization", {
        defaultValue: "Filter by organization",
      }),
      allLabel: t("admin.users.filter_organization_all", {
        defaultValue: "All organizations",
      }),
      options: orgOptions.map((o) => ({ value: o.id, label: o.name })),
    },
  ];

  return (
    <DataTableToolbar
      search={table.search}
      onSearchChange={table.setSearch}
      searchPlaceholder={t("admin.users.search_placeholder", {
        defaultValue: "Search by name or email…",
      })}
      filters={filterDefs}
      filterValues={{
        role: table.roleFilter,
        organization: table.orgFilter,
      }}
      onFilterChange={(filterId, value) => {
        if (filterId === ROLE_FILTER_ID) table.setRoleFilter(value);
        else table.setOrgFilter(value);
      }}
      onResetAllFilters={() => {
        table.setRoleFilter(undefined);
        table.setOrgFilter(undefined);
      }}
      clearLabel={t("admin.users.clear_filters", {
        defaultValue: "Clear filters",
      })}
    />
  );
}
