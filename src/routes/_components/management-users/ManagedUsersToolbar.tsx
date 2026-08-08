import { DataTableToolbar, type FilterDef } from "@/components/ui/data-table-toolbar";

import type { ManagedUsersController } from "./use-managed-users";

const ROLE_FILTER_ID = "role";

/**
 * Manager users toolbar: search box + role filter chip on the shared
 * DataTableToolbar, matching the admin users toolbar. Deliberately no
 * organization filter — the backend forces the caller's org server-side,
 * so there is nothing to pick. Role options come from the same seeded
 * catalog that drives the Role column labels.
 */
export function ManagedUsersToolbar({ c }: { c: ManagedUsersController }) {
  const { t, table, roleOptions } = c;

  const filterDefs: FilterDef[] = [
    {
      id: ROLE_FILTER_ID,
      label: t("admin.users.filter_role", { defaultValue: "Filter by role" }),
      options: roleOptions.map((r) => ({ value: r.code, label: r.name })),
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
      filterValues={{ role: table.roleFilter }}
      onFilterChange={(filterId, value) => {
        if (filterId === ROLE_FILTER_ID) table.setRoleFilter(value);
      }}
      onResetAllFilters={() => table.setRoleFilter(undefined)}
      clearLabel={t("admin.users.clear_filters", {
        defaultValue: "Clear filters",
      })}
    />
  );
}
